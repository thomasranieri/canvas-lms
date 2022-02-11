# frozen_string_literal: true

#
# Copyright (C) 2020 - present Instructure, Inc.
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
#

require_relative "../graphql_spec_helper"

describe Types::LearningOutcomeType do
  before(:once) do
    account_admin_user
    @account_user = Account.default.account_users.first
    @domain_root_account = Account.default

    outcome_with_individual_ratings(context: Account.default)
  end

  let(:outcome_type) { GraphQLTypeTester.new(@outcome, { current_user: @admin, domain_root_account: @domain_root_account }) }

  let(:outcome_type_raw) do
    outcome_type_raw = GraphQLTypeTester.new(@outcome, { current_user: @admin, domain_root_account: @domain_root_account })
    outcome_type_raw.extract_result = false
    outcome_type_raw
  end

  context "with IOM and IORC enabled and ALMS disabled" do
    before(:once) do
      @domain_root_account.enable_feature! :improved_outcomes_management
      @domain_root_account.enable_feature! :individual_outcome_rating_and_calculation
      @domain_root_account.disable_feature! :account_level_mastery_scales
    end

    it "returns outcome with ratings and calculation" do
      expect(outcome_type.resolve("_id")).to eq @outcome.id.to_s
      expect(outcome_type.resolve("contextId")).to eq @outcome.context_id.to_s
      expect(outcome_type.resolve("contextType")).to eq @outcome.context_type
      expect(outcome_type.resolve("title")).to eq @outcome.title
      expect(outcome_type.resolve("description")).to eq @outcome.description
      expect(outcome_type.resolve("assessed")).to eq @outcome.assessed?
      expect(outcome_type.resolve("displayName")).to eq @outcome.display_name
      expect(outcome_type.resolve("vendorGuid")).to eq @outcome.vendor_guid
      expect(outcome_type.resolve("calculationMethod")).to eq @outcome.calculation_method
      expect(outcome_type.resolve("calculationMethod")).not_to be_nil
      expect(outcome_type.resolve("calculationInt")).to eq @outcome.calculation_int
      expect(outcome_type.resolve("pointsPossible")).to eq @outcome.points_possible
      expect(outcome_type.resolve("masteryPoints")).to eq @outcome.rubric_criterion[:mastery_points]

      raw = outcome_type_raw.resolve("ratings { description points }")
      expect(raw["ratings"].map(&:symbolize_keys)).to eq @outcome.rubric_criterion[:ratings]

      expect(outcome_type.resolve("canEdit")).to eq true
    end
  end

  context "with any other combination of FF" do
    def set_feature_flag_by_bit(feature_flag, bit_value)
      @domain_root_account.set_feature_flag!(feature_flag, bit_value == 1 ? Feature::STATE_ON : Feature::STATE_OFF)
    end

    (0..7).each do |mask|
      next if mask == 6

      ff_iom = (mask >> 2) & 1
      ff_iorc = (mask >> 1) & 1
      ff_alms = mask & 1

      it "returns no ratings and calculation (IOM: #{ff_iom}, IORC: #{ff_iorc}, ALMS: #{ff_alms})" do
        set_feature_flag_by_bit :improved_outcomes_management, ff_iom
        set_feature_flag_by_bit :individual_outcome_rating_and_calculation, ff_iorc
        set_feature_flag_by_bit :account_level_mastery_scales, ff_alms

        expect(outcome_type.resolve("calculationMethod")).to be_nil
        expect(outcome_type.resolve("calculationInt")).to be_nil
        expect(outcome_type.resolve("pointsPossible")).to be_nil
        expect(outcome_type.resolve("masteryPoints")).to be_nil
        expect(outcome_type.resolve("ratings { points }")).to be_nil
      end
    end
  end

  context "without edit permission" do
    before(:once) do
      RoleOverride.manage_role_override(@account_user.account, @account_user.role, "manage_outcomes", override: false)
    end

    it "returns canEdit false" do
      expect(outcome_type.resolve("canEdit")).to eq false
    end
  end

  context "without read permission" do
    before(:once) do
      user_model
    end

    let(:outcome_type) { GraphQLTypeTester.new(@outcome, current_user: @user) }

    it "returns nil" do
      expect(outcome_type.resolve("_id")).to be_nil
    end
  end

  context "assessed" do
    before(:once) do
      outcome_with_rubric(outcome: @outcome, context: Account.default)
      course_with_student
    end

    it "returns false when not assessed" do
      expect(outcome_type.resolve("assessed")).to eq false
    end

    it "returns true when assessed" do
      rubric_assessment_model(rubric: @rubric, user: @student)
      expect(outcome_type.resolve("assessed")).to eq true
    end

    it "returns false when assessment deleted" do
      assessment = rubric_assessment_model(rubric: @rubric, user: @student)
      assessment.learning_outcome_results.destroy_all
      expect(outcome_type.resolve("assessed")).to eq false
    end
  end

  context "imported" do
    let(:course) { Course.create! }
    let(:root_group) { course.root_outcome_group }

    it "returns false when not imported" do
      expect(outcome_type.resolve("isImported(targetContextType: \"Course\", targetContextId: #{course.id})"))
        .to eq false
    end

    it "returns true when imported" do
      root_group.add_outcome(@outcome)
      expect(outcome_type.resolve("isImported(targetContextType: \"Course\", targetContextId: #{course.id})"))
        .to eq true
    end
  end

  context "friendlyDescription" do
    let(:course) { Course.create! }

    it "resolves friendly description correctly" do
      Account.site_admin.enable_feature!(:outcomes_friendly_description)
      course.account.enable_feature!(:improved_outcomes_management)

      course_fd = OutcomeFriendlyDescription.create!({
                                                       learning_outcome: @outcome,
                                                       context: course,
                                                       description: "course's description"
                                                     })

      expect(outcome_type.resolve("friendlyDescription(contextType: \"Course\", contextId: #{course.id}) { _id }"))
        .to eq course_fd.id.to_s
    end
  end
end
