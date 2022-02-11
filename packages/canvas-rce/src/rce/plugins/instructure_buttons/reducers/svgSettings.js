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

import {DEFAULT_SETTINGS} from '../svg/constants'

export const defaultState = DEFAULT_SETTINGS

export const actions = {
  SET_ENCODED_IMAGE: 'SetEncodedImage',
  SET_ENCODED_IMAGE_TYPE: 'SetEncodedImageType',
  SET_ENCODED_IMAGE_NAME: 'SetEncodedImageName'
}

export const svgSettings = (state, action) => {
  switch (action.type) {
    case actions.SET_ENCODED_IMAGE:
      return {...state, encodedImage: action.payload}
    case actions.SET_ENCODED_IMAGE_TYPE:
      return {...state, encodedImageType: action.payload}
    case actions.SET_ENCODED_IMAGE_NAME:
      return {...state, encodedImageName: action.payload}
    default:
      return {...state, ...action}
  }
}
