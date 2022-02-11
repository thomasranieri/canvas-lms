# frozen_string_literal: true

#
# Copyright (C) 2022 - present Instructure, Inc.
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

module OutcomesFeaturesHelper
  def individual_outcome_rating_and_calculation_enabled?(context)
    context.root_account.feature_enabled?(:improved_outcomes_management) &&
      context.root_account.feature_enabled?(:individual_outcome_rating_and_calculation) &&
      !context.root_account.feature_enabled?(:account_level_mastery_scales)
  end
end
