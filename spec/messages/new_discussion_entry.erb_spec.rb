# frozen_string_literal: true

#
# Copyright (C) 2011 - present Instructure, Inc.
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

require_relative "messages_helper"

describe "new_discussion_entry" do
  before :once do
    discussion_topic_model
    @object = @topic.discussion_entries.create!(user: user_model)
  end

  let(:asset) { @object }
  let(:notification_name) { :new_discussion_entry }

  include_examples "a message"

  context ".email" do
    let(:path_type) { :email }

    it "renders" do
      msg = generate_message(notification_name, path_type, asset)
      expect(msg.url).to match(%r{/courses/\d+/discussion_topics/\d+})
      expect(msg.body).to match(%r{/courses/\d+/discussion_topics/\d+})
    end

    it "renders correct footer if replys are enabled" do
      IncomingMailProcessor::MailboxAccount.reply_to_enabled = true
      msg = generate_message(notification_name, path_type, asset)
      expect(msg.body.include?("replying to this message")).to eq true
    end

    it "renders correct footer if replys are disabled" do
      IncomingMailProcessor::MailboxAccount.reply_to_enabled = false
      msg = generate_message(notification_name, path_type, asset)
      expect(msg.body.include?("replying to this message")).to eq false
    end

    context "fully anonymous topic" do
      let(:anonymous_topic) { discussion_topic_model(anonymous_state: "full_anonymity") }

      before :once do
        @user = user_model(name: "Chawn Neal")
        @object = anonymous_topic.discussion_entries.create!(user: @user)
      end

      it "does not render user name" do
        msg = generate_message(notification_name, path_type, @object)
        expect(msg.body).to match(/Anonymous\s\w+\sreplied\sto/)
        expect(msg.body).not_to include(@user.short_name)
      end
    end
  end
end
