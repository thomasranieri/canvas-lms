# frozen_string_literal: true

#
# Copyright (C) 2021 - present Instructure, Inc.
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

describe Types::DiscussionEntryType do
  let_once(:discussion_entry) { create_valid_discussion_entry }
  let(:parent) { discussion_entry.discussion_topic.discussion_entries.create!(message: "parent_entry", parent_id: discussion_entry.id, user: @teacher) }
  let(:sub_entry) { discussion_entry.discussion_topic.discussion_entries.create!(message: "sub_entry", parent_id: parent.id, user: @teacher) }
  let(:discussion_entry_type) { GraphQLTypeTester.new(discussion_entry, current_user: @teacher) }
  let(:discussion_sub_entry_type) { GraphQLTypeTester.new(sub_entry, current_user: @teacher) }
  let(:permissions) do
    [
      {
        value: "delete",
        allowed: proc { |user| discussion_entry.grants_right?(user, :delete) }
      },
      {
        value: "rate",
        allowed: proc { |user| discussion_entry.grants_right?(user, :rate) }
      },
      {
        value: "viewRating",
        allowed: proc { discussion_entry.discussion_topic.allow_rating && !discussion_entry.deleted? }
      }
    ]
  end

  it "works" do
    expect(discussion_entry_type.resolve("_id")).to eq discussion_entry.id.to_s
  end

  it "queries the attributes" do
    parent_entry = discussion_entry.discussion_topic.discussion_entries.create!(message: "sub entry", user: @teacher, parent_id: discussion_entry.id, editor: @teacher)
    type = GraphQLTypeTester.new(parent_entry, current_user: @teacher)
    expect(type.resolve("discussionTopicId")).to eq parent_entry.discussion_topic_id.to_s
    expect(type.resolve("parentId")).to eq parent_entry.parent_id.to_s
    expect(type.resolve("rootEntryId")).to eq parent_entry.root_entry_id.to_s
    expect(type.resolve("message")).to eq parent_entry.message
    expect(type.resolve("ratingSum")).to eq parent_entry.rating_sum
    expect(type.resolve("ratingCount")).to eq parent_entry.rating_count
    expect(type.resolve("deleted")).to eq parent_entry.deleted?
    expect(type.resolve("author { _id }")).to eq parent_entry.user_id.to_s
    expect(type.resolve("editor { _id }")).to eq parent_entry.editor_id.to_s
    expect(type.resolve("discussionTopic { _id }")).to eq parent_entry.discussion_topic.id.to_s
  end

  it "has an attachment" do
    a = attachment_model
    discussion_entry.attachment = a
    discussion_entry.save!

    expect(discussion_entry_type.resolve("attachment { _id }")).to eq discussion_entry.attachment.id.to_s
    expect(discussion_entry_type.resolve("attachment { displayName }")).to eq discussion_entry.attachment.display_name
  end

  it "queries the isolated entry id" do
    expect(discussion_sub_entry_type.resolve("isolatedEntryId")).to eq sub_entry.parent_id.to_s
    sub_entry.update!(legacy: false)
    expect(discussion_sub_entry_type.resolve("isolatedEntryId")).to eq sub_entry.root_entry_id.to_s
  end

  describe "quoted entry" do
    before do
      allow(Account.site_admin).to receive(:feature_enabled?).with(:isolated_view).and_return(true)
    end

    it "returns the reply preview data" do
      message = "<p>Hey I am a pretty long message with <strong>bold text</strong>. </p>" # .length => 71
      parent.message = message * 5 # something longer than the default 150 chars
      parent.save
      type = GraphQLTypeTester.new(sub_entry, current_user: @teacher)
      sub_entry.update!(include_reply_preview: true)
      expect(type.resolve("quotedEntry { author { shortName } }")).to eq parent.user.short_name
      expect(type.resolve("quotedEntry { createdAt }")).to eq parent.created_at.iso8601
      expect(type.resolve("quotedEntry { previewMessage }")).to eq parent.summary(500) # longer than the message
      expect(type.resolve("quotedEntry { previewMessage }").length).to eq 235
    end
  end

  context "anonymous discussions" do
    before do
      @anon_discussion = DiscussionTopic.create!(title: "Welcome whoever you are",
                                                 message: "anonymous discussion",
                                                 anonymous_state: "full_anonymity",
                                                 context: @course,
                                                 user: @teacher)

      @partially_anon_discussion = DiscussionTopic.create!(title: "Welcome whoever you are",
                                                           message: "anonymous discussion",
                                                           anonymous_state: "partial_anonymity",
                                                           context: @course,
                                                           user: @teacher)

      @anon_teacher_discussion_entry = @anon_discussion.discussion_entries.create!(message: "Hello!", user: @teacher, editor: @teacher)
      @anon_teacher_discussion_entry_type = GraphQLTypeTester.new(@anon_teacher_discussion_entry, current_user: @teacher)

      course_with_student(course: @course)
      @anon_student_discussion_entry = @anon_discussion.discussion_entries.create!(message: "Why, hello back to you!", user: @student, editor: @student)
      @anon_student_discussion_entry_type = GraphQLTypeTester.new(@anon_student_discussion_entry, current_user: @teacher)

      ta_in_course(course: @course)
      @anon_ta_discussion_entry = @anon_discussion.discussion_entries.create!(message: "Why, hello back to you!", user: @ta, editor: @ta)
      @anon_ta_discussion_entry_type = GraphQLTypeTester.new(@anon_ta_discussion_entry, current_user: @teacher)

      course_with_designer(course: @course)
      @anon_designer_discussion_entry = @anon_discussion.discussion_entries.create!(message: "I designed this course!", user: @designer, editor: @designer)
      @anon_designer_discussion_entry_type = GraphQLTypeTester.new(@anon_designer_discussion_entry, current_user: @teacher)

      @partial_anon_student_discussion_entry_exposed = @partially_anon_discussion.discussion_entries.create!(message: "Why, hello there!", user: @student, editor: @student, is_anonymous_author: false)
      @partial_anon_student_discussion_entry_exposed_type = GraphQLTypeTester.new(@partial_anon_student_discussion_entry_exposed, current_user: @teacher)

      @partial_anon_student_discussion_entry_not_exposed = @partially_anon_discussion.discussion_entries.create!(message: "Why, hello there!", user: @student, editor: @student, is_anonymous_author: true)
      @partial_anon_student_discussion_entry_not_exposed_type = GraphQLTypeTester.new(@partial_anon_student_discussion_entry_not_exposed, current_user: @teacher)
    end

    it "returns the author of teacher post" do
      expect(@anon_teacher_discussion_entry_type.resolve("author { shortName }")).to eq @teacher.short_name
    end

    it "returns the author of ta post" do
      expect(@anon_ta_discussion_entry_type.resolve("author { shortName }")).to eq @ta.short_name
    end

    it "returns the author of designer post" do
      expect(@anon_designer_discussion_entry_type.resolve("author { shortName }")).to eq @designer.short_name
    end

    it "does not return the author of student anonymous entry" do
      expect(@anon_student_discussion_entry_type.resolve("author { shortName }")).to eq nil
    end

    it "does not return the editor of student anonymous entry" do
      expect(@anon_student_discussion_entry_type.resolve("editor { shortName }")).to eq nil
    end

    it "returns current_user for anonymousAuthor when the current user created the entry" do
      expect(@anon_teacher_discussion_entry_type.resolve("anonymousAuthor { shortName }")).to eq "current_user"
    end

    it "returns anonymous short name for an anonymous author" do
      student_in_course(active_all: true)
      expect(GraphQLTypeTester.new(@anon_teacher_discussion_entry, current_user: @student).resolve("anonymousAuthor { shortName }")).to eq @anon_discussion.discussion_topic_participants.where(user_id: @teacher.id).first.id.to_s(36)
    end

    it "returns the teacher author if a course id is provided" do
      expect(@anon_teacher_discussion_entry_type.resolve("author(courseId: #{@course.id}) { shortName }")).to eq @teacher.short_name
    end

    it "returns the teacher editor if a course id is provided" do
      expect(@anon_teacher_discussion_entry_type.resolve("editor(courseId: #{@course.id}) { shortName }")).to eq @teacher.short_name
    end

    it "returns the designer author if a course id is provided" do
      expect(@anon_designer_discussion_entry_type.resolve("author(courseId: #{@course.id}) { shortName }")).to eq @designer.short_name
    end

    it "returns the designer editor if a course id is provided" do
      expect(@anon_designer_discussion_entry_type.resolve("editor(courseId: #{@course.id}) { shortName }")).to eq @designer.short_name
    end

    it "does not return the student author if a course id is provided" do
      expect(@anon_student_discussion_entry_type.resolve("author(courseId: #{@course.id}) { shortName }")).to eq nil
    end

    it "does not return the student editor if a course id is provided" do
      expect(@anon_student_discussion_entry_type.resolve("editor(courseId: #{@course.id}) { shortName }")).to eq nil
    end

    describe "quoted reply" do
      let(:anon_discussion_teacher_quoted) { @anon_discussion.discussion_entries.create!(message: "quoting teacher", parent_id: @anon_teacher_discussion_entry.id, user: @student, include_reply_preview: true) }
      let(:anon_teacher_quoted_type) { GraphQLTypeTester.new(anon_discussion_teacher_quoted, current_user: @teacher) }

      let(:anon_discussion_ta_quoted) { @anon_discussion.discussion_entries.create!(message: "quoting student", parent_id: @anon_ta_discussion_entry.id, user: @student, include_reply_preview: true) }
      let(:anon_ta_quoted_type) { GraphQLTypeTester.new(anon_discussion_ta_quoted, current_user: @teacher) }

      let(:anon_discussion_designer_quoted) { @anon_discussion.discussion_entries.create!(message: "quoting designer", parent_id: @anon_designer_discussion_entry.id, user: @student, include_reply_preview: true) }
      let(:anon_designer_quoted_type) { GraphQLTypeTester.new(anon_discussion_designer_quoted, current_user: @teacher) }

      let(:anon_discussion_student_quoted) { @anon_discussion.discussion_entries.create!(message: "quoting student", parent_id: @anon_student_discussion_entry.id, user: @student, include_reply_preview: true) }
      let(:anon_student_quoted_type) { GraphQLTypeTester.new(anon_discussion_student_quoted, current_user: @teacher) }

      before do
        allow(Account.site_admin).to receive(:feature_enabled?).with(:isolated_view).and_return(true)
      end

      it "returns the author information of a teacher post" do
        expect(anon_teacher_quoted_type.resolve("quotedEntry { author { shortName } }")).to eq @anon_teacher_discussion_entry.user.short_name
      end

      it "returns the author information of a ta post" do
        expect(anon_ta_quoted_type.resolve("quotedEntry { author { shortName } }")).to eq @anon_ta_discussion_entry.user.short_name
      end

      it "returns the author information of a designer post" do
        expect(anon_designer_quoted_type.resolve("quotedEntry { author { shortName } }")).to eq @anon_designer_discussion_entry.user.short_name
      end

      it "does not return author of anonymous student" do
        expect(anon_student_quoted_type.resolve("quotedEntry { author { shortName } }")).to eq nil
      end
    end

    context "partial anonymity" do
      context "when is_anonymous_author is set to true" do
        it "does not return author" do
          expect(@partial_anon_student_discussion_entry_not_exposed_type.resolve("author(courseId: #{@course.id}) { shortName }")).to eq nil
        end

        it "does not return editor" do
          expect(@partial_anon_student_discussion_entry_not_exposed_type.resolve("editor(courseId: #{@course.id}) { shortName }")).to eq nil
        end

        it "returns anonymous_author" do
          expect(@partial_anon_student_discussion_entry_not_exposed_type.resolve("anonymousAuthor { shortName }")).to eq @partially_anon_discussion.discussion_topic_participants.where(user_id: @student.id).first.id.to_s(36)
        end
      end

      context "when is_anonymous_author is set to false" do
        it "returns author" do
          expect(@partial_anon_student_discussion_entry_exposed_type.resolve("author(courseId: #{@course.id}) { shortName }")).to eq @student.short_name
        end

        it "returns editor" do
          expect(@partial_anon_student_discussion_entry_exposed_type.resolve("editor(courseId: #{@course.id}) { shortName }")).to eq @student.short_name
        end

        it "does not return anonymous_author" do
          expect(@partial_anon_student_discussion_entry_exposed_type.resolve("anonymousAuthor { shortName }")).to eq nil
        end
      end
    end
  end

  it "does not query for discussion subentries on non legacy entries" do
    discussion_entry.discussion_topic.discussion_entries.create!(message: "sub entry", user: @teacher, parent_id: parent.id)
    DiscussionEntry.where(id: parent).update_all(legacy: false)

    result = GraphQLTypeTester.new(parent, current_user: @teacher).resolve("discussionSubentriesConnection { nodes { message } }")
    expect(result).to be_nil
  end

  it "allows querying for discussion subentries on legacy parents" do
    de = sub_entry
    result = GraphQLTypeTester.new(parent, current_user: @teacher).resolve("discussionSubentriesConnection { nodes { message } }")
    expect(result.count).to be 1
    expect(result[0]).to eq de.message
  end

  it "allows querying for discussion subentries with sort" do
    de1 = sub_entry

    result = GraphQLTypeTester.new(parent, current_user: @teacher).resolve("discussionSubentriesConnection(sortOrder: desc) { nodes { message } }")
    expect(result.count).to be 1
    expect(result[0]).to eq de1.message
  end

  it "allows querying for the last subentry" do
    de = discussion_entry
    4.times do |i|
      de = discussion_entry.discussion_topic.discussion_entries.create!(message: "sub entry #{i}", user: @teacher, parent_id: de.id)
    end

    result = discussion_entry_type.resolve("lastReply { message }")
    expect(result).to eq de.message
  end

  it "allows querying for participant counts" do
    3.times { discussion_entry.discussion_topic.discussion_entries.create!(message: "sub entry", user: @teacher, parent_id: discussion_entry.id) }

    expect(discussion_entry_type.resolve("rootEntryParticipantCounts { unreadCount }")).to eq 0
    expect(discussion_entry_type.resolve("rootEntryParticipantCounts { repliesCount }")).to eq 3
    DiscussionEntryParticipant.where(user_id: @teacher).update_all(workflow_state: "unread")
    expect(discussion_entry_type.resolve("rootEntryParticipantCounts { unreadCount }")).to eq 3
    expect(discussion_entry_type.resolve("rootEntryParticipantCounts { repliesCount }")).to eq 3
  end

  it "allows querying for participant information" do
    expect(discussion_entry_type.resolve("entryParticipant { read }")).to eq true
    expect(discussion_entry_type.resolve("entryParticipant { forcedReadState }")).to be_nil
    expect(discussion_entry_type.resolve("entryParticipant { rating }")).to eq false
    expect(discussion_entry_type.resolve("entryParticipant { reportType }")).to be_nil
  end

  it "does not allows querying for participant counts on non root_entries" do
    de_type = GraphQLTypeTester.new(parent, current_user: @teacher)
    expect(de_type.resolve("rootEntryParticipantCounts { unreadCount }")).to be_nil
  end

  it "returns a null message when entry is marked as deleted" do
    discussion_entry.destroy
    expect(discussion_entry_type.resolve("message")).to eq nil
  end

  it "returns nil for subentries count on non legacy non root entries" do
    sub_entry
    DiscussionEntry.where(id: parent).update_all(legacy: false)
    expect(GraphQLTypeTester.new(parent, current_user: @teacher).resolve("subentriesCount")).to be_nil
  end

  it "returns subentries count" do
    4.times do |i|
      discussion_entry.discussion_topic.discussion_entries.create!(message: "sub entry #{i}", user: @teacher, parent_id: parent.id)
    end

    expect(GraphQLTypeTester.new(parent, current_user: @teacher).resolve("subentriesCount")).to eq 4
  end

  it "returns the current user permissions" do
    student_in_course(active_all: true)
    discussion_entry.update(depth: 4)
    type = GraphQLTypeTester.new(discussion_entry, current_user: @student)

    permissions.each do |permission|
      expect(type.resolve("permissions { #{permission[:value]} }")).to eq permission[:allowed].call(@student)

      expect(discussion_entry_type.resolve("permissions { #{permission[:value]} }")).to eq permission[:allowed].call(@teacher)
    end
  end

  describe "forced_read_state attribute" do
    context "forced_read_state is nil" do
      before do
        discussion_entry.update_or_create_participant({ current_user: @teacher, forced: false, new_state: "read" })
      end

      it "returns false" do
        expect(discussion_entry_type.resolve("entryParticipant { forcedReadState }")).to be false
      end
    end

    context "forced_read_state is false" do
      before do
        discussion_entry.update_or_create_participant({ current_user: @teacher, forced: false })
      end

      it "returns false" do
        expect(discussion_entry_type.resolve("entryParticipant { forcedReadState }")).to be false
      end
    end

    context "forced_read_state is true" do
      before do
        discussion_entry.update_or_create_participant({ current_user: @teacher, forced: true })
      end

      it "returns true" do
        expect(discussion_entry_type.resolve("entryParticipant { forcedReadState }")).to be true
      end
    end
  end

  it "returns the root entry if there is one" do
    de = discussion_entry.discussion_topic.discussion_entries.create!(message: "sub entry", user: @teacher, parent_id: discussion_entry.id)

    expect(discussion_entry_type.resolve("rootEntry { _id }")).to be nil

    sub_entry_type = GraphQLTypeTester.new(de, current_user: @teacher)
    expect(sub_entry_type.resolve("rootEntry { _id }")).to eq discussion_entry.id.to_s
  end
end
