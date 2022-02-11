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
import {JSDOM} from 'jsdom'
import {mount} from 'enzyme'
import {merge} from 'lodash'
import FilesCollection from '@canvas/files/backbone/collections/FilesCollection'
import Folder from '@canvas/files/backbone/models/Folder'
import SearchResults from '../SearchResults'

const defaultProps = (props = {}) => {
  const ref = document.createElement('div')
  const folder = new Folder()
  folder.files.loadedAll = true
  folder.folders.loadedAll = true

  return merge(
    {
      contextType: 'courses',
      contextId: 1,
      collection: new FilesCollection([{id: '1'}]),
      filesDirectoryRef: ref,
      currentFolder: folder,
      externalToolsForContext: [],
      params: {},
      areAllItemsSelected: () => {},
      query: {},
      modalOptions: {},
      pathname: '/',
      previewItem: () => {},
      toggleItemSelected: () => {},
      userCanAddFilesForContext: true,
      userCanEditFilesForContext: true,
      userCanRestrictFilesForContext: true,
      userCanDeleteFilesForContext: true,
      usageRightsRequiredForContext: true,
      splat: '',
      toggleAllSelected: () => {},
      selectedItems: [],
      dndOptions: {},
      clearSelectedItems: () => {},
      onMove: () => {}
    },
    props
  )
}

describe('SearchResults', () => {
  let oldEnv

  beforeEach(() => {
    oldEnv = window.ENV
    window.ENV = {
      COURSE_ID: '101',
      FEATURES: {
        files_dnd: true
      },
      context_asset_string: 'course_17'
    }
  })

  afterEach(() => {
    window.ENV = oldEnv
  })

  describe('File Menu', () => {
    let wrapper, menuItems

    beforeEach(() => {
      // eslint-disable-next-line no-global-assign
      document = new JSDOM('')
      document.body.appendChild(document.createElement('div'))
      const props = {...defaultProps()}
      const collection = new FilesCollection([{id: '1'}])
      wrapper = mount(<SearchResults {...props} />, {attachTo: document.body.firstChild})
      wrapper.instance().setState({collection})
      menuItems = Array.from(document.body.querySelectorAll('.al-options [role="menuitem"]'))
    })

    afterEach(() => {
      // eslint-disable-next-line no-global-assign
      document = new JSDOM('')
      wrapper.detach()
    })

    describe('Download item', () => {
      it('renders', () => {
        expect(menuItems.some(i => i.textContent === 'Download')).toEqual(true)
      })
    })

    describe('Send To item', () => {
      it('renders', () => {
        expect(menuItems.some(i => i.textContent === 'Send To...')).toEqual(true)
      })

      it('renders a modal for sending the file, when clicked', () => {
        wrapper.instance().setState({sendFileId: '1'})
        expect(document.body.querySelector('[role="dialog"][aria-label="Send To..."]')).toBeTruthy()
      })
    })

    describe('Copy To item', () => {
      it('renders', () => {
        expect(menuItems.some(i => i.textContent === 'Copy To...')).toEqual(true)
      })

      it('renders a modal for sending the file, when clicked', () => {
        wrapper.instance().setState({copyFileId: '1'})
        expect(document.body.querySelector('[role="dialog"][aria-label="Copy To..."]')).toBeTruthy()
      })
    })

    it('Rename item renders', () => {
      expect(menuItems.some(i => i.textContent === 'Rename')).toEqual(true)
    })

    it('Move item renders', () => {
      expect(menuItems.some(i => i.textContent === 'Move')).toEqual(true)
    })

    it('Delete item renders', () => {
      expect(menuItems.some(i => i.textContent === 'Delete')).toEqual(true)
    })
  })
})
