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

import React, {Component} from 'react'
import PropTypes from 'prop-types'

import {convertLatexToMathMl} from '../mathlive'

import {TextArea} from '@instructure/ui-text-area'
import {CloseButton, Button} from '@instructure/ui-buttons'
import {Checkbox} from '@instructure/ui-checkbox'
import {Heading} from '@instructure/ui-heading'
import {Modal} from '@instructure/ui-modal'

import formatMessage from '../../../../format-message'

import EquationEditorToolbar from '../EquationEditorToolbar'

import {css} from 'aphrodite'
import mathml from './mathml'
import styles from './styles'

export default class EquationEditorModal extends Component {
  static propTypes = {
    editor: PropTypes.object.isRequired,
    label: PropTypes.string.isRequired,
    onModalDismiss: PropTypes.func.isRequired,
    onModalClose: PropTypes.func.isRequired,
    onEquationSubmit: PropTypes.func.isRequired,
    title: PropTypes.node,
    mountNode: PropTypes.string
  }

  static boundaryRegex = /\\\((.+?)\\\)/g

  static defaultProps = {
    title: null,
    mountNode: null
  }

  state = {
    advanced: false,
    workingFormula: ''
  }

  originalFormula = null

  previewElement = React.createRef()

  // **************** //
  // Helper functions //
  // **************** //

  currentFormula(nodeValue, cursor) {
    let leftIndex, rightIndex
    // The range could still contain more than one formulae, so we need to
    // isolate them and figure out which one the cursor is within.
    const formulae = nodeValue.match(EquationEditorModal.boundaryRegex)
    if (!formulae) {
      return [undefined, 0, 0]
    }

    const foundFormula = formulae.find(formula => {
      leftIndex = nodeValue.indexOf(formula)
      rightIndex = leftIndex + formula.length
      return leftIndex < cursor && cursor < rightIndex && this.selectionIsLatex(formula)
    })
    return [foundFormula, leftIndex, rightIndex]
  }

  insertNewRange(currentFormula, startContainer, leftIndex, rightIndex) {
    const {editor} = this.props
    const range = document.createRange()
    range.setStart(startContainer, leftIndex)
    range.setEnd(startContainer, rightIndex)

    editor.selection.setRng(range)
    this.originalFormula = this.selectionToLatex(currentFormula)
    this.mathField.setValue(this.originalFormula || ' ')
  }

  loadExistingFormula() {
    const {editor} = this.props
    const selection = editor.selection.getContent()

    if (selection && this.selectionIsLatex(selection)) {
      this.originalFormula = this.selectionToLatex(selection)
      this.mathField.setValue(this.originalFormula || ' ')
    } else {
      const selnode = editor.selection.getNode()
      if (selnode.tagName === 'IMG' && selnode.classList.contains('equation_image')) {
        try {
          const src = new URL(selnode.src)
          const encoded_eq = src.pathname.replace(/^\/equation_images\//, '')
          this.originalFormula = decodeURIComponent(decodeURIComponent(encoded_eq))
          this.mathField.setValue(this.originalFormula || ' ')
        } catch (ex) {
          // probably failed to create the new URL
          // eslint-disable-next-line no-console
          console.error(ex)
        }
      } else {
        const editorRange = editor.selection.getRng()
        const startContainer = editorRange.startContainer
        const wholeText = startContainer.wholeText

        if (wholeText) {
          const cursor = editorRange.startOffset
          // The `wholeText` value is not sufficient, since we could be dealing with
          // a number of nested ranges. The `nodeValue` is the text in the range in
          // which we have found the cursor.
          const nodeValue = startContainer.nodeValue
          const [currentFormula, leftIndex, rightIndex] = this.currentFormula(nodeValue, cursor)

          if (currentFormula !== undefined) {
            this.insertNewRange(currentFormula, startContainer, leftIndex, rightIndex)
          }
        }
      }
    }
  }

  selectionIsLatex(selection) {
    return selection.startsWith('\\(') && selection.endsWith('\\)')
  }

  selectionToLatex(selection) {
    return selection.substr(2, selection.length - 4)
  }

  // ********* //
  // Callbacks //
  // ********* //

  executeCommand = (cmd, advancedCmd) => {
    if (this.state.advanced) {
      const effectiveCmd = advancedCmd || cmd
      this.setState(state => ({workingFormula: state.workingFormula + effectiveCmd}))
    } else {
      this.mathField.insert(cmd, {focus: 'true'})
    }
  }

  handleEntered = () => {
    this.loadExistingFormula()
  }

  handleModalCancel = e => {
    const element = e.srcElement || e.targetElement
    // MathJax Menu clicks closes modal. MathJax doesn't let us to get the menu click event
    // to use stopPropagation().
    const isMathJaxEvent =
      element &&
      (element.id === 'MathJax_MenuFrame' ||
        element.classList.contains('MathJax_Menu') ||
        element.classList.contains('MathJax_MenuItem'))
    if (isMathJaxEvent) {
      return
    }
    this.props.onModalDismiss?.()
  }

  handleModalDone = () => {
    const {onModalDismiss, onEquationSubmit} = this.props
    const output = this.state.advanced ? this.state.workingFormula : this.mathField.getValue()

    if (output) {
      onEquationSubmit(output)
    }
    onModalDismiss()
  }

  setPreviewElementContent() {
    if (!this.state.advanced) {
      return
    }
    const mathMlContent = convertLatexToMathMl(this.state.workingFormula)
    if (mathMlContent) {
      this.previewElement.current.innerHTML = `<math>${mathMlContent}</math>`
      mathml.processNewMathInElem(this.previewElement.current)
    } else {
      this.previewElement.current.innerHTML = ''
    }
  }

  toggleAdvanced = () => {
    this.setState(state => {
      if (state.advanced) {
        this.mathField.setValue(state.workingFormula || '')
        return {advanced: false, workingFormula: ''}
      } else {
        return {advanced: true, workingFormula: this.mathField.getValue()}
      }
    })
  }

  handleOpen = () => {
    this.originalFormula = null
  }

  handleFieldRef = node => {
    this.mathField = node
  }

  // ******************* //
  // Rendering functions //
  // ******************* //

  renderFooter = () => {
    const cancelButton = <Button onClick={this.handleModalCancel}>{formatMessage('Cancel')}</Button>

    const doneButton = (
      <Button margin="none none none xx-small" onClick={this.handleModalDone} variant="primary">
        {formatMessage('Done')}
      </Button>
    )

    return (
      <div>
        {cancelButton}
        {doneButton}
      </div>
    )
  }

  handleRef = node => {
    this.modalFooter = node
  }

  componentDidMount() {
    this.setPreviewElementContent()
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.workingFormula !== prevState.workingFormula) {
      this.setPreviewElementContent()
    }
  }

  render = () => {
    const {label, onModalClose, title, mountNode} = this.props

    return (
      <Modal
        label={label}
        onClose={onModalClose}
        onDismiss={this.handleModalCancel}
        onEntered={this.handleEntered}
        onOpen={this.handleOpen}
        open
        mountNode={mountNode}
        transition="fade"
      >
        <Modal.Header>
          <CloseButton
            placement="end"
            offset="medium"
            variant="icon"
            onClick={this.handleModalCancel}
          >
            {formatMessage('Close')}
          </CloseButton>
          <Heading>{title || label}</Heading>
        </Modal.Header>
        <Modal.Body>
          <div
            ref={node => {
              this.modalContent = node
            }}
            className={css(styles.mathfieldContainer)}
          >
            <div>
              <EquationEditorToolbar executeCommand={this.executeCommand} />
            </div>

            <div
              className={css(styles.mathFieldContainer)}
              style={{display: this.state.advanced ? 'none' : null}}
            >
              <math-field
                style={{
                  padding: '0.5em',
                  overflow: 'auto',
                  border: 'solid 1px',
                  borderRadius: '4px'
                }}
                ref={this.handleFieldRef}
                default-mode="math"
                virtual-keyboard-mode="off"
                keypress-sound="none"
                plonk-sound="none"
                math-mode-space=" "
              />
            </div>

            <div
              className={css(styles.mathFieldContainer)}
              style={{display: this.state.advanced ? null : 'none'}}
            >
              <TextArea
                style={{
                  height: '5.1rem',
                  overflowY: 'auto',
                  lineHeight: '1.7rem'
                }}
                label=""
                value={this.state.workingFormula}
                onChange={e => this.setState({workingFormula: e.target.value})}
              />
            </div>

            <div className={css(styles.latexToggle)}>
              <Checkbox
                onChange={this.toggleAdvanced}
                checked={this.state.advanced}
                label={formatMessage('Directly Edit LaTeX')}
                variant="toggle"
              />
            </div>

            <div style={{display: this.state.advanced ? null : 'none', marginTop: '1em'}}>
              <span data-testid="mathml-preview-element" ref={this.previewElement} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer ref={this.handleRef}>{this.renderFooter()}</Modal.Footer>
      </Modal>
    )
  }
}
