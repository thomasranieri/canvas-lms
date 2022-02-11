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
class PacePlanDueDatesCalculator
  attr_reader :pace_plan

  def initialize(pace_plan)
    @pace_plan = pace_plan
  end

  def get_due_dates(items, enrollment = nil, start_date: nil)
    due_dates = {}
    start_date = start_date || enrollment&.start_at&.to_date || pace_plan.start_date

    # We have to make sure we start counting on a day that is enabled
    unless PacePlansDateHelpers.day_is_enabled?(start_date, pace_plan.exclude_weekends, blackout_dates)
      start_date = PacePlansDateHelpers.first_enabled_day(start_date, pace_plan.exclude_weekends, blackout_dates)
    end

    items.each do |item|
      due_date = PacePlansDateHelpers.add_days(
        start_date,
        item.duration,
        pace_plan.exclude_weekends,
        blackout_dates
      )

      # If the pace plan hasn't been committed yet we need to group the items from their module_item_id or we will
      # end up grouping them by nil and losing the data for each item as it gets overwritten by the next item.
      key = pace_plan.persisted? ? item.id : item.module_item_id
      due_dates[key] = due_date.to_date
      start_date = due_date # The next item's start date is this item's due date
    end

    due_dates
  end

  private

  def blackout_dates
    @blackout_dates ||= pace_plan.course.blackout_dates
  end
end
