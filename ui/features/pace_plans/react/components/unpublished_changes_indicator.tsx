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

import React, {useEffect} from 'react'
import {CondensedButton} from '@instructure/ui-buttons'
// @ts-ignore: TS doesn't understand i18n scoped imports
import I18n from 'i18n!unpublished_changes_button_props'
import {getPacePlan, getPlanPublishing, getUnpublishedChangeCount} from '../reducers/pace_plans'
import {StoreState} from '../types'
import {connect} from 'react-redux'
import {getCategoryError} from '../reducers/ui'
import {Spinner} from '@instructure/ui-spinner'
import {PresentationContent} from '@instructure/ui-a11y-content'
import {Text} from '@instructure/ui-text'
import {View} from '@instructure/ui-view'

type StateProps = {
  changeCount: number
  planPublishing: boolean
  newPlan: boolean
  publishError?: string
}

export type UnpublishedChangesIndicatorProps = StateProps & {
  onClick?: () => void
  onUnpublishedNavigation?: (e: BeforeUnloadEvent) => void
  margin?: any // type from CondensedButtonProps; passed through
}

const text = (changeCount: number) => {
  if (changeCount < 0) throw Error(`changeCount cannot be negative (${changeCount})`)
  if (changeCount === 0) return I18n.t('All changes published')

  return I18n.t(
    {
      one: '1 unpublished change',
      other: '%{count} unpublished changes'
    },
    {count: changeCount}
  )
}

// Show browser warning about unsaved changes per
// https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload
const triggerBrowserWarning = (e: BeforeUnloadEvent) => {
  // Preventing default triggers prompt in Firefox & Safari
  e.preventDefault()
  // Return value must be set to trigger prompt in Chrome & Edge
  e.returnValue = ''
}

export const UnpublishedChangesIndicator = ({
  changeCount,
  margin,
  newPlan,
  onClick,
  planPublishing,
  publishError,
  onUnpublishedNavigation = triggerBrowserWarning
}: UnpublishedChangesIndicatorProps) => {
  const hasChanges = changeCount > 0

  useEffect(() => {
    if (hasChanges) {
      window.addEventListener('beforeunload', onUnpublishedNavigation)
      return () => window.removeEventListener('beforeunload', onUnpublishedNavigation)
    }
  }, [hasChanges, onUnpublishedNavigation])

  if (newPlan) return null

  if (publishError !== undefined) {
    return (
      <View margin={margin}>
        <Text color="danger">{I18n.t('Publishing error')}</Text>
      </View>
    )
  }

  if (planPublishing) {
    return (
      <View>
        <Spinner size="x-small" margin="0 x-small 0" renderTitle={I18n.t('Publishing plan...')} />
        <PresentationContent>
          <Text>{I18n.t('Publishing plan...')}</Text>
        </PresentationContent>
      </View>
    )
  }

  return changeCount ? (
    <CondensedButton data-testid="publish-status-button" onClick={onClick} margin={margin}>
      {text(changeCount)}
    </CondensedButton>
  ) : (
    <View margin={margin} data-testid="publish-status">
      {text(changeCount)}
    </View>
  )
}

const mapStateToProps = (state: StoreState) => ({
  changeCount: getUnpublishedChangeCount(state),
  planPublishing: getPlanPublishing(state),
  newPlan: !getPacePlan(state)?.id,
  publishError: getCategoryError(state, 'publish')
})

export default connect(mapStateToProps)(UnpublishedChangesIndicator)
