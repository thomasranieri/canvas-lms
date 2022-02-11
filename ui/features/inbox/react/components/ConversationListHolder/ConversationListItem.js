/*
 * Copyright (C) 2020 - present Instructure, Inc.
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

import {Badge} from '@instructure/ui-badge'
import {Button, IconButton} from '@instructure/ui-buttons'
import {Checkbox} from '@instructure/ui-checkbox'
import {Focusable} from '@instructure/ui-focusable'
import {Grid} from '@instructure/ui-grid'
import {
  IconStarLightLine,
  IconStarSolid,
  IconEmptyLine,
  IconEmptySolid
} from '@instructure/ui-icons'
import PropTypes from 'prop-types'
import React, {useState} from 'react'
import {Responsive} from '@instructure/ui-responsive'
import {responsiveQuerySizes} from '../../../util/utils'
import {ScreenReaderContent} from '@instructure/ui-a11y-content'
import {Text} from '@instructure/ui-text'
import {TruncateText} from '@instructure/ui-truncate-text'
import {View} from '@instructure/ui-view'
import I18n from 'i18n!conversations_2'
import {colors} from '@instructure/canvas-theme'

export const ConversationListItem = ({...props}) => {
  const [isHovering, setIsHovering] = useState(false)

  const handleConversationClick = e => {
    e.nativeEvent.stopImmediatePropagation()
    e.stopPropagation()

    // Kind of a hack since our Checkbox doesn't support onChange or swallowing
    // events with ease. Removing aria-hidden elemnts from sending click events
    if (e.target.getAttribute('aria-hidden') === 'true') {
      return
    }

    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      props.onSelect(e, props.id, props.conversation, true)
    } else {
      props.onSelect(e, props.id, props.conversation, false)
      props.onOpen()
    }
  }

  const handleConversationStarClick = e => {
    e.nativeEvent.stopImmediatePropagation()
    e.stopPropagation()

    // Kind of a hack since our Checkbox doesn't support onChange or swallowing
    // events with ease. Removing aria-hidden elemnts from sending click events
    if (e.target.getAttribute('aria-hidden') === 'true') {
      return
    }
    props.onStar(!props.isStarred, props.conversation._id)
  }

  const formatParticipants = () => {
    const participantsStr = props.conversation.conversationParticipantsConnection.nodes
      .filter(
        p => p.user.name !== props.conversation.conversationMessagesConnection.nodes[0].author.name
      )
      .reduce((prev, curr) => {
        return prev + ', ' + curr.user.name
      }, '')

    return (
      <Responsive
        match="media"
        query={responsiveQuerySizes({tablet: true, desktop: true})}
        props={{
          tablet: {
            participants: {
              size: 'x-small'
            },
            datatestid: 'list-item-tablet'
          },
          desktop: {
            participants: {
              size: 'small'
            },
            datatestid: 'list-item-desktop'
          }
        }}
        render={responsiveProps => (
          <Text
            weight="bold"
            size={responsiveProps.participants.size}
            data-testid={responsiveProps.datatestid}
          >
            <TruncateText>
              <b>{props.conversation.conversationMessagesConnection.nodes[0].author.name}</b>
              {participantsStr}
            </TruncateText>
          </Text>
        )}
      />
    )
  }

  const formatDate = rawDate => {
    const date = new Date(rawDate)
    return date.toDateString()
  }

  return (
    <Responsive
      match="media"
      query={responsiveQuerySizes({tablet: true, desktop: true})}
      props={{
        tablet: {
          participants: {
            size: 'x-small'
          },
          date: {
            size: 'x-small'
          },
          subject: {
            size: 'x-small'
          },
          message: {
            size: 'x-small'
          }
        },
        desktop: {
          participants: {
            size: 'small'
          },
          date: {
            size: 'small'
          },
          subject: {
            size: 'small'
          },
          message: {
            size: 'small'
          }
        }
      }}
      render={responsiveProps => (
        <div
          style={{
            // TODO: Move these styles to a stylesheet once we are moved to the app/ directory
            boxShadow: isHovering && 'inset -4px 0px 0px rgb(0, 142, 226)',
            backgroundColor: props.isSelected && 'rgb(229,242,248)'
          }}
        >
          <View
            data-testid="conversation"
            as="div"
            borderWidth="none none small none"
            padding="small x-small"
          >
            <Grid
              data-testid="conversationListItem-Item"
              vAlign="middle"
              colSpacing="none"
              rowSpacing="none"
              onMouseEnter={() => {
                setIsHovering(true)
              }}
              onMouseLeave={() => {
                setIsHovering(false)
              }}
              onClick={handleConversationClick}
            >
              <Grid.Row>
                <Grid.Col width="auto">
                  <View
                    textAlign="center"
                    as="div"
                    width={30}
                    height={30}
                    padding="xx-small"
                    margin="0 small 0 0"
                  >
                    <Checkbox
                      data-testid="conversationListItem-Checkbox"
                      label={
                        <ScreenReaderContent>
                          {props.isSelected ? I18n.t('selected') : I18n.t('not selected')}
                        </ScreenReaderContent>
                      }
                      checked={props.isSelected}
                      onChange={e => {
                        e.stopPropagation()
                      }}
                    />
                  </View>
                </Grid.Col>
                <Grid.Col>
                  <Text color="brand" size={responsiveProps.date.size}>
                    {formatDate(
                      props.conversation.conversationMessagesConnection.nodes[0]?.createdAt
                    )}
                  </Text>
                </Grid.Col>
                <Grid.Col width="auto">
                  <Badge
                    count={props.conversation.conversationMessagesConnection.nodes?.length}
                    countUntil={99}
                    standalone
                    theme={{
                      colorPrimary: colors.backgroundDarkest,
                      borderRadius: '0.25rem',
                      fontSize: '0.8125rem',
                      fontWeight: '700'
                    }}
                  />
                </Grid.Col>
              </Grid.Row>
              <Grid.Row>
                <Grid.Col width="auto">
                  <View textAlign="center" as="div" width={30} height={30} margin="0 small 0 0">
                    <IconButton
                      color="primary"
                      data-testid={props.isUnread ? 'unread-badge' : 'read-badge'}
                      margin="x-small"
                      onClick={() =>
                        props.readStateChangeConversationParticipants({
                          variables: {
                            conversationIds: [props.conversation._id],
                            workflowState: props.isUnread ? 'read' : 'unread'
                          }
                        })
                      }
                      screenReaderLabel={props.isUnread ? I18n.t('Unread') : I18n.t('Read')}
                      size="small"
                      withBackground={false}
                      withBorder={false}
                    >
                      {props.isUnread ? <IconEmptySolid /> : <IconEmptyLine />}
                    </IconButton>
                  </View>
                </Grid.Col>
                <Grid.Col>{formatParticipants()}</Grid.Col>
              </Grid.Row>
              <Grid.Row>
                <Grid.Col width="auto">
                  <View textAlign="center" as="div" width={30} height={30} margin="0 small 0 0" />
                </Grid.Col>
                <Grid.Col>
                  <Text weight="normal" size={responsiveProps.subject.size}>
                    <TruncateText>{props.conversation.subject}</TruncateText>
                  </Text>
                </Grid.Col>
              </Grid.Row>
              <Grid.Row>
                <Grid.Col width="auto">
                  <View textAlign="center" as="div" width={30} height={30} margin="0 small 0 0" />
                </Grid.Col>
                <Grid.Col>
                  <Text color="secondary" size={responsiveProps.message.size}>
                    <TruncateText>
                      {props.conversation.conversationMessagesConnection?.nodes[0]?.body}
                    </TruncateText>
                  </Text>
                </Grid.Col>
                <Grid.Col width="auto">
                  <View textAlign="center" as="div" width={30} height={30} margin="0 small 0 0">
                    <Focusable>
                      {({focused}) => {
                        return (
                          <div>
                            {focused || isHovering || props.isStarred ? (
                              <IconButton
                                size="small"
                                withBackground={false}
                                withBorder={false}
                                renderIcon={props.isStarred ? IconStarSolid : IconStarLightLine}
                                screenReaderLabel={
                                  props.isStarred ? I18n.t('starred') : I18n.t('not starred')
                                }
                                onClick={handleConversationStarClick}
                                data-testid="visible-star"
                              />
                            ) : (
                              <ScreenReaderContent>
                                <IconButton
                                  size="small"
                                  withBackground={false}
                                  withBorder={false}
                                  renderIcon={props.isStarred ? IconStarSolid : IconStarLightLine}
                                  screenReaderLabel={
                                    props.isStarred ? I18n.t('starred') : I18n.t('not starred')
                                  }
                                  onClick={handleConversationStarClick}
                                />
                              </ScreenReaderContent>
                            )}
                          </div>
                        )
                      }}
                    </Focusable>
                  </View>
                </Grid.Col>
              </Grid.Row>
              <Grid.Row>
                <Grid.Col>
                  <Focusable>
                    {({focused}) => {
                      return focused ? (
                        <Button
                          display="block"
                          textAlign="center"
                          size="small"
                          onClick={handleConversationClick}
                        >
                          {I18n.t('Open Conversation')}
                        </Button>
                      ) : (
                        <ScreenReaderContent tabIndex="0">
                          {I18n.t('Open Conversation')}
                        </ScreenReaderContent>
                      )
                    }}
                  </Focusable>
                </Grid.Col>
              </Grid.Row>
            </Grid>
          </View>
        </div>
      )}
    />
  )
}

const participantProp = PropTypes.shape({name: PropTypes.string})

const conversationMessageProp = PropTypes.shape({
  author: participantProp,
  participants: PropTypes.arrayOf(participantProp),
  created_at: PropTypes.string,
  body: PropTypes.string
})

export const conversationProp = PropTypes.shape({
  id: PropTypes.string,
  _id: PropTypes.string,
  subject: PropTypes.string,
  participants: PropTypes.arrayOf(participantProp),
  conversationMessages: PropTypes.arrayOf(conversationMessageProp),
  conversationMessagesConnection: PropTypes.object,
  conversationParticipantsConnection: PropTypes.object
})

ConversationListItem.propTypes = {
  conversation: conversationProp,
  id: PropTypes.string,
  isSelected: PropTypes.bool,
  isStarred: PropTypes.bool,
  isUnread: PropTypes.bool,
  onOpen: PropTypes.func,
  onSelect: PropTypes.func,
  onStar: PropTypes.func,
  readStateChangeConversationParticipants: PropTypes.func
}
