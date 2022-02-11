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

import I18n from 'i18n!discussion_posts'

import {AssignmentAvailabilityContainer} from '../AssignmentAvailabilityContainer/AssignmentAvailabilityContainer'
import PropTypes from 'prop-types'
import React from 'react'
import {responsiveQuerySizes} from '../../utils'

import {Text} from '@instructure/ui-text'
import {Flex} from '@instructure/ui-flex'
import {Responsive} from '@instructure/ui-responsive'
import {DiscussionAvailabilityContainer} from '../DiscussionAvailabilityContainer/DiscussionAvailabilityContainer'

export function DiscussionDetails({...props}) {
  const pointsPossible = props.discussionTopic?.assignment?.pointsPossible || 0

  return (
    <Responsive
      match="media"
      query={responsiveQuerySizes({tablet: true, desktop: true})}
      props={{
        tablet: {
          text: I18n.t(
            {
              one: '1 point',
              other: '%{count} points'
            },
            {
              count: pointsPossible
            }
          ),
          textSize: 'x-small'
        },
        desktop: {
          text: I18n.t(
            {
              one: '1 point possible',
              other: '%{count} points possible'
            },
            {
              count: pointsPossible
            }
          ),
          textSize: 'small'
        }
      }}
      render={responsiveProps => (
        <>
          {props.discussionTopic.assignment ? (
            <Flex data-testid="graded-discussion-info">
              <Flex.Item padding="xx-small" shouldGrow shouldShrink align="start">
                <AssignmentAvailabilityContainer
                  assignment={props.discussionTopic?.assignment}
                  isAdmin={props.discussionTopic.permissions.readAsAdmin}
                />
              </Flex.Item>
              <Flex.Item padding="xx-small" shouldShrink align="end" overflowY="hidden">
                <Text weight="normal" size={responsiveProps.textSize}>
                  {responsiveProps.text}
                </Text>
              </Flex.Item>
            </Flex>
          ) : (
            <Flex data-testid="non-graded-discussion-info">
              <Flex.Item padding="xx-small" shouldGrow shouldShrink align="start">
                <DiscussionAvailabilityContainer
                  courseSections={props.discussionTopic.courseSections}
                  totalUserCount={props.discussionTopic.userCount}
                  lockAt={props.discussionTopic.lockAt}
                  delayedPostAt={props.discussionTopic.delayedPostAt}
                  anonymousState={props.discussionTopic.anonymousState}
                  groupSet={props.discussionTopic.groupSet}
                />
              </Flex.Item>
            </Flex>
          )}
        </>
      )}
    />
  )
}

DiscussionDetails.propTypes = {
  discussionTopic: PropTypes.object
}

export default DiscussionDetails
