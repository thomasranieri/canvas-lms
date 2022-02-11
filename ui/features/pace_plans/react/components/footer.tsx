/*
 * Copyright (C) 2021 - present Instructure, Inc.
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
import {connect} from 'react-redux'
// @ts-ignore: TS doesn't understand i18n scoped imports
import I18n from 'i18n!pace_plans_footer'

import {Button} from '@instructure/ui-buttons'
import {Flex} from '@instructure/ui-flex'
import {Spinner} from '@instructure/ui-spinner'
import {Tooltip} from '@instructure/ui-tooltip'

import {StoreState} from '../types'
import {getAutoSaving, getShowLoadingOverlay} from '../reducers/ui'
import {pacePlanActions} from '../actions/pace_plans'
import {getPlanPublishing, getUnpublishedChangeCount, isStudentPlan} from '../reducers/pace_plans'

interface StoreProps {
  readonly autoSaving: boolean
  readonly planPublishing: boolean
  readonly showLoadingOverlay: boolean
  readonly studentPlan: boolean
  readonly unpublishedChanges: boolean
}

interface DispatchProps {
  publishPlan: typeof pacePlanActions.publishPlan
  resetPlan: typeof pacePlanActions.resetPlan
}

type ComponentProps = StoreProps & DispatchProps

export const Footer: React.FC<ComponentProps> = ({
  autoSaving,
  planPublishing,
  publishPlan,
  resetPlan,
  showLoadingOverlay,
  studentPlan,
  unpublishedChanges
}) => {
  if (studentPlan) return null

  const disabled = autoSaving || planPublishing || showLoadingOverlay || !unpublishedChanges
  // This wrapper div attempts to roughly match the dimensions of the publish button
  const publishLabel = planPublishing ? (
    <div style={{display: 'inline-block', margin: '-0.5rem 0.9rem'}}>
      <Spinner size="x-small" renderTitle={I18n.t('Publishing plan...')} />
    </div>
  ) : (
    I18n.t('Publish')
  )
  let cancelTip, pubTip
  if (autoSaving || planPublishing) {
    cancelTip = I18n.t('You cannot cancel while publishing')
    pubTip = I18n.t('You cannot publish while publishing')
  } else if (showLoadingOverlay) {
    cancelTip = I18n.t('You cannot cancel while loading the plan')
    pubTip = I18n.t('You cannot publish while loading the plan')
  } else {
    cancelTip = I18n.t('There are no pending changes to cancel')
    pubTip = I18n.t('There are no pending changes to publish')
  }
  return (
    <Flex as="section" justifyItems="end">
      <Tooltip renderTip={disabled && cancelTip} on={disabled ? ['hover', 'focus'] : []}>
        <Button color="secondary" margin="0 small 0" onClick={() => disabled || resetPlan()}>
          {I18n.t('Cancel')}
        </Button>
      </Tooltip>
      <Tooltip renderTip={disabled && pubTip} on={disabled ? ['hover', 'focus'] : []}>
        <Button color="primary" onClick={() => disabled || publishPlan()}>
          {publishLabel}
        </Button>
      </Tooltip>
    </Flex>
  )
}

const mapStateToProps = (state: StoreState): StoreProps => {
  return {
    autoSaving: getAutoSaving(state),
    planPublishing: getPlanPublishing(state),
    showLoadingOverlay: getShowLoadingOverlay(state),
    studentPlan: isStudentPlan(state),
    unpublishedChanges: getUnpublishedChangeCount(state) !== 0
  }
}

export default connect(mapStateToProps, {
  publishPlan: pacePlanActions.publishPlan,
  resetPlan: pacePlanActions.resetPlan
})(Footer)
