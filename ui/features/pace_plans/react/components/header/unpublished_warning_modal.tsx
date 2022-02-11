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
// @ts-ignore: TS doesn't understand i18n scoped imports
import I18n from 'i18n!unpublished_warning_modal'
import {Button} from '@instructure/ui-buttons'
import {Text} from '@instructure/ui-text'
import {View} from '@instructure/ui-view'
import Modal from '@canvas/instui-bindings/react/InstuiModal'

export type UnpublishedWarningModalProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

const UnpublishedWarningModal = ({open, onCancel, onConfirm}) => {
  return (
    <Modal
      data-testid="unpublished-warning-modal"
      size="small"
      open={open}
      onDismiss={onCancel}
      label={I18n.t('Warning')}
    >
      <Modal.Body>
        <View>
          <Text>
            {I18n.t(
              'You have unpublished changes to your Course Pace Plan. Continuing will discard these changes.'
            )}
          </Text>
        </View>
      </Modal.Body>
      <Modal.Footer>
        <View>
          <Button onClick={onCancel}>{I18n.t('Keep Editing')}</Button>
          <Button margin="0 x-small" onClick={onConfirm} color="danger">
            {I18n.t('Discard Changes')}
          </Button>
        </View>
      </Modal.Footer>
    </Modal>
  )
}

export default UnpublishedWarningModal
