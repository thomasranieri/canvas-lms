/*
 * Copyright (C) 2011 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import GradebookData from './react/default_gradebook/GradebookData'
import ready from '@instructure/ready'

import('@canvas/context-cards/react/StudentContextCardTrigger')

ready(() => {
  const mountPoint = document.querySelector('#gradebook_app')
  const filterNavNode = document.querySelector('#gradebook-filter-nav')
  const gradebookMenuNode = document.querySelector('[data-component="GradebookMenu"]')
  const settingsModalButtonContainer = document.getElementById(
    'gradebook-settings-modal-button-container'
  )
  const gridColorNode = document.querySelector('[data-component="GridColor"]')
  const viewOptionsMenuNode = document.querySelector("[data-component='ViewOptionsMenu']")
  const applyScoreToUngradedModalNode = document.querySelector(
    '[data-component="ApplyScoreToUngradedModal"]'
  )
  const gradingPeriodsFilterContainer = document.getElementById('grading-periods-filter-container')
  const flashMessageContainer = document.getElementById('flash_message_holder')

  ReactDOM.render(
    <GradebookData
      applyScoreToUngradedModalNode={applyScoreToUngradedModalNode}
      currentUserId={ENV.current_user_id}
      filterNavNode={filterNavNode}
      flashMessageContainer={flashMessageContainer}
      gradebookEnv={ENV.GRADEBOOK_OPTIONS}
      gradebookMenuNode={gradebookMenuNode}
      gradingPeriodsFilterContainer={gradingPeriodsFilterContainer}
      gridColorNode={gridColorNode}
      locale={ENV.LOCALE}
      settingsModalButtonContainer={settingsModalButtonContainer}
      viewOptionsMenuNode={viewOptionsMenuNode}
    />,
    mountPoint
  )
})
