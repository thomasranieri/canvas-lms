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

require_relative "../common"
require_relative "pages/paceplans_common_page"
require_relative "pages/paceplans_page"
require_relative "../courses/pages/courses_home_page"

describe "pace plan page" do
  include_context "in-process server selenium tests"
  include PacePlansCommonPageObject
  include PacePlansPageObject
  include CoursesHomePage

  before :once do
    teacher_setup
    course_with_student(
      active_all: true,
      name: "Jessi Jenkins",
      course: @course
    )
    enable_pace_plans_in_course
  end

  before do
    user_session @teacher
  end

  context "pace plan not enabled" do
    it "does not include Pace Plans navigation element when disabled" do
      disable_pace_plans_in_course
      visit_course(@course)

      expect(pace_plans_nav_exists?).to be_falsey
    end
  end

  context "pace plans in course navigation" do
    it "navigates to the pace plans page when Pace Plans is clicked" do
      visit_course(@course)

      click_pace_plans

      expect(driver.current_url).to include("/courses/#{@course.id}/pace_plans")
    end
  end

  context "pace plans modules" do
    let(:module_title) { "First Module" }
    let(:module_assignment_title) { "Module Assignment" }

    before :once do
      @course_module = create_course_module(module_title, "active")
      @assignment = create_assignment(@course, module_assignment_title, "Module Assignment Description", 10, "published")
      @module_item = @course_module.add_item(id: @assignment.id, type: "assignment")
    end

    it "shows the module and module items in the pace plan" do
      discussion_title = "Module Discussion"
      discussion_assignment = create_graded_discussion(@course, discussion_title, "published")
      @course_module.add_item(id: discussion_assignment.id, type: "discussion_topic")
      quiz_title = "Quiz Title"
      quiz = create_quiz(@course, quiz_title)
      @course_module.add_item(id: quiz.id, type: "quiz")

      visit_pace_plans_page

      expect(module_title_text(0)).to include(module_title)
      expect(module_item_title_text(0)).to start_with(module_assignment_title)
      expect(module_item_title_text(1)).to start_with(discussion_title)
      expect(module_item_title_text(2)).to start_with(quiz_title)
    end

    it "shows the published status for items" do
      unpublished_assignment = create_assignment(@course, "unpub assignment", "unpub description", 10, "unpublished")
      @course_module.add_item(id: unpublished_assignment.id, type: "assignment")

      visit_pace_plans_page

      expect(module_item_publish_status[0]).to be_displayed
      expect(module_item_unpublish_status[0]).to be_displayed
    end

    it "has a link to the assignment for the title" do
      visit_pace_plans_page
      title_element = module_item_title(@assignment.title)

      expect(
        element_value_for_attr(title_element, "href")
      ).to include("courses/#{@course.id}/modules/items/#{@module_item.id}")
    end

    it "shows the points possible for a module item" do
      visit_pace_plans_page

      expect(module_item_points_possible[0].text).to eq("10 pts")
    end

    it "does not show a module item that is not an assignment" do
      page = @course.wiki_pages.create!(title: "New Page Title")
      @course_module.add_item(id: page.id, type: "wiki_page")
      @course_module.add_item(type: "external_url",
                              url: "http://example.com/lolcats",
                              title: "pls view")
      @course_module.add_item(type: "sub_header", title: "silly tag")

      visit_pace_plans_page

      expect(module_items.count).to eq(1)
      expect(module_item_title_text(0)).to start_with(module_assignment_title)
    end

    it "does not show any publish status when no pace plan created yet" do
      visit_pace_plans_page

      expect(publish_status_exists?).to be_falsey
    end

    it "updates duration to make Publish and Cancel buttons enabled" do
      visit_pace_plans_page

      update_module_item_duration(0, 2)

      expect(publish_button).to be_enabled
      expect(cancel_button).to be_enabled
    end

    it "does not allow duration to be set to negative number" do
      visit_pace_plans_page

      update_module_item_duration(0, "-1")

      expect(duration_field[0].text).not_to eq("-1")
    end
  end

  context "Pace Plan Menu" do
    let(:pace_module_title) { "Pace Module" }
    let(:module_assignment_title) { "Module Assignment 1" }

    before :once do
      create_published_pace_plan(pace_module_title, module_assignment_title)
    end

    it "initially shows the Course Pace Plan in pace plan menu" do
      visit_pace_plans_page

      expect(pace_plan_menu_value).to eq("Course Pace Plan")
    end

    it "opens the pace plan menu and selects the student view when clicked" do
      visit_pace_plans_page
      click_main_pace_plan_menu
      click_students_menu_item
      click_student_pace_plan(@student.name)

      expect(pace_plan_menu_value).to eq(@student.name)
    end

    it "shows actual student assignment day and due dates" do
      visit_pace_plans_page
      click_main_pace_plan_menu
      click_students_menu_item
      click_student_pace_plan(@student.name)

      expect(duration_readonly.text).to eq("2")
    end

    it "displays modal regarding unpublished changes when going to student view" do
      visit_pace_plans_page
      update_module_item_duration(0, 3)
      click_main_pace_plan_menu
      click_students_menu_item
      click_student_pace_plan(@student.name)

      expect(unpublished_warning_modal).to be_displayed
    end
  end

  context "settings button" do
    it "opens the settings menu when button is clicked" do
      visit_pace_plans_page
      click_settings_button

      expect(skip_weekends_exists?).to be_truthy
    end

    it "toggles skip weekends when clicked" do
      visit_pace_plans_page
      click_settings_button

      click_weekends_checkbox
      expect(is_checked(skip_weekends_checkbox_selector)).to be_falsey

      click_weekends_checkbox
      expect(is_checked(skip_weekends_checkbox_selector)).to be_truthy
    end
  end

  context "Published Pace Plan Status" do
    let(:pace_module_title) { "Pace Module" }
    let(:module_assignment_title) { "Module Assignment 1" }

    before :once do
      create_published_pace_plan(pace_module_title, module_assignment_title)
    end

    it "shows publish status on when PP is published" do
      visit_pace_plans_page

      expect { publish_status.text }.to become("All changes published")
    end
  end
end
