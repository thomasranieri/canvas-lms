# frozen_string_literal: true

#
# Copyright (C) 2018 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.

module Lti::IMS::Concerns
  module DeepLinkingModules
    extend ActiveSupport::Concern

    CREATE_NEW_MODULE_PLACEMENTS = %w[course_assignments_menu module_index_menu_modal].freeze
    ALLOW_LINE_ITEM_PLACEMENTS = %w[course_assignments_menu module_index_menu_modal assignment_selection].freeze

    def create_resources_from_content_items?
      add_module_items? || add_assignment?
    end

    def add_assignment?
      # only allow this for Course contexts
      return false unless @context.respond_to? :assignments
      return false unless allow_line_items?

      lti_resource_links.any? { |item| item.key?(:lineItem) }
    end

    def allow_line_items?
      return false unless @context.root_account.feature_enabled? :lti_deep_linking_line_items

      ALLOW_LINE_ITEM_PLACEMENTS.include?(params[:placement])
    end

    def add_module_items?
      return true if create_new_module?

      add_item_to_existing_module? && lti_resource_links.length > 1
    end

    def create_new_module?
      return false unless @context.root_account.feature_enabled?(:lti_deep_linking_module_index_menu_modal)

      CREATE_NEW_MODULE_PLACEMENTS.include?(params[:placement])
    end

    def add_item_to_existing_module?
      params[:context_module_id].present?
    end

    # the iframe property in a deep linking response can contain
    # link-specific launch dimensions, which if present overrides
    # the dimensions set on the tool
    def launch_dimensions(content_item)
      return nil unless content_item[:iframe]

      {
        selection_width: content_item[:iframe][:width],
        selection_height: content_item[:iframe][:height]
      }
    end

    def build_module_item(content_item)
      {
        type: "context_external_tool",
        id: tool.id,
        new_tab: 0,
        indent: 0,
        url: content_item[:url],
        title: content_item[:title],
        position: 1,
        workflow_state: "unpublished",
        link_settings: launch_dimensions(content_item),
        custom_params: Lti::DeepLinkingUtil.validate_custom_params(content_item[:custom])
      }
    end

    def validate_line_item!(content_item)
      if content_item.dig(:lineItem, :label)
        content_item[:title] = content_item.dig(:lineItem, :label)
      end

      unless content_item.dig(:lineItem, :scoreMaximum)
        content_item[:errors] = { "lineItem.scoreMaximum": I18n.t("lineItem.scoreMaximum is a required field") }
        return false
      end

      true
    end

    def create_assignment!(content_item)
      Assignment.transaction do
        assignment =
          @context.assignments.create!(
            {
              submission_types: "external_tool",
              title: content_item[:title],
              description: content_item[:text],
              points_possible: content_item.dig(:lineItem, :scoreMaximum),
              unlock_at: content_item.dig(:available, :startDateTime),
              lock_at: content_item.dig(:available, :endDateTime),
              due_at: content_item.dig(:submission, :endDateTime),
              workflow_state: "unpublished",
              external_tool_tag_attributes: {
                content_type: "ContextExternalTool",
                content_id: tool.id,
                new_tab: 0,
                url: content_item[:url]
              }
            }
          )

        # make sure custom launch dimensions get to the ContentTag for launch from assignment
        assignment.external_tool_tag.update!(link_settings: launch_dimensions(content_item))

        # default line item is created if assigment has submission_types: external_tool,
        # and an external tool tag
        line_item = assignment.line_items.first
        line_item.update!(
          {
            resource_id: content_item.dig(:lineItem, :resourceId),
            tag: content_item.dig(:lineItem, :tag)
          }
        )

        # custom params are stored on the ResourceLink, to be retrieved during launch
        line_item.resource_link.update!(
          custom: Lti::DeepLinkingUtil.validate_custom_params(content_item[:custom])
        )

        content_item[:errors] = assignment.errors unless assignment.valid?

        content_item[:assignment_id] = assignment.id
      end
    end
  end
end
