# frozen_string_literal: true

#
# Copyright (C) 2014 - present Instructure, Inc.
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

require_relative "quiz_user_messager_spec_helper"

describe Quizzes::QuizUserMessager do
  include Quizzes::QuizUserMessagerSpecHelper

  before :once do
    course_with_teacher(active_all: true)
    course_quiz(true)
    course_with_student(active_all: true, course: @course)
    @unsubmitted = @student
    course_with_student(active_all: true, course: @course)
    @submitted = @student
    submission = @quiz.generate_submission(@submitted)
    submission.mark_completed
    Quizzes::SubmissionGrader.new(submission).grade_submission
    @finder = Quizzes::QuizUserFinder.new(@quiz, @teacher)
  end

  describe "#send" do
    it "sends to all students" do
      expect { send_message }.to change { recipient_messages("all") }.by 2
    end

    it "can send to either submitted or unsubmitted students" do
      expect do
        send_message("submitted")
      end.to change { recipient_messages("submitted") }.by 1

      expect do
        send_message("unsubmitted")
      end.to change { recipient_messages("unsubmitted") }.by 1
    end
  end
end
