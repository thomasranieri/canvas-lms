/*
 * Copyright (C) 2022 - present Instructure, Inc.
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

import formatMessage from '../../../../../../format-message'
import {actions} from '../../../reducers/imageSection'

import {UploadFile} from '../../../../shared/Upload/UploadFile'

export const onSubmit = dispatch => (_editor, _accept, _selectedPanel, uploadData) => {
  const {theFile} = uploadData

  dispatch({...actions.SET_IMAGE, payload: theFile.preview})
  dispatch({...actions.SET_IMAGE_NAME, payload: theFile.name})
  dispatch(actions.CLEAR_MODE)
}

const Upload = ({editor, dispatch}) => {
  return (
    <UploadFile
      accept="image/*"
      editor={editor}
      label={formatMessage('Upload Image')}
      panels={['COMPUTER']}
      onDismiss={() => {
        dispatch(actions.CLEAR_MODE)
      }}
      requireA11yAttributes={false}
      onSubmit={onSubmit(dispatch)}
    />
  )
}

export default Upload
