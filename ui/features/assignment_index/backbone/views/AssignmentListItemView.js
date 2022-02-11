//
// Copyright (C) 2013 - present Instructure, Inc.
//
// This file is part of Canvas.
//
// Canvas is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero General Public License as published by the Free
// Software Foundation, version 3 of the License.
//
// Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
// A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
// details.
//
// You should have received a copy of the GNU Affero General Public License along
// with this program. If not, see <http://www.gnu.org/licenses/>.

import I18n from 'i18n!AssignmentListItemView'
import Backbone from '@canvas/backbone'
import $ from 'jquery'
import React from 'react'
import ReactDOM from 'react-dom'
import CyoeHelper from '@canvas/conditional-release-cyoe-helper'
import DirectShareUserModal from '@canvas/direct-sharing/react/components/DirectShareUserModal'
import DirectShareCourseTray from '@canvas/direct-sharing/react/components/DirectShareCourseTray'
import * as MoveItem from '@canvas/move-item-tray'
import Assignment from '@canvas/assignments/backbone/models/Assignment.coffee'
import PublishIconView from '@canvas/publish-icon-view'
import LockIconView from '@canvas/lock-icon'
import DateDueColumnView from '@canvas/assignments/backbone/views/DateDueColumnView.coffee'
import DateAvailableColumnView from '@canvas/assignments/backbone/views/DateAvailableColumnView.coffee'
import CreateAssignmentView from './CreateAssignmentView.coffee'
import SisButtonView from '@canvas/sis/backbone/views/SisButtonView.coffee'
import preventDefault from 'prevent-default'
import template from '../../jst/AssignmentListItem.handlebars'
import scoreTemplate from '../../jst/_assignmentListItemScore.handlebars'
import round from 'round'
import AssignmentKeyBindingsMixin from '../mixins/AssignmentKeyBindingsMixin'
import 'jqueryui/tooltip'
import '@canvas/rails-flash-notifications'
import {shimGetterShorthand} from '@canvas/util/legacyCoffeesScriptHelpers'

let AssignmentListItemView

export default AssignmentListItemView = (function () {
  AssignmentListItemView = class AssignmentListItemView extends Backbone.View {
    constructor(...args) {
      super(...args)
      this.onMove = this.onMove.bind(this)
      this.updatePublishState = this.updatePublishState.bind(this)
      this.toggleHidden = this.toggleHidden.bind(this)
      this.createModuleToolTip = this.createModuleToolTip.bind(this)
      this.addAssignmentToList = this.addAssignmentToList.bind(this)
      this.addMigratedQuizToList = this.addMigratedQuizToList.bind(this)
      this.onDuplicate = this.onDuplicate.bind(this)
      this.onDuplicateFailedRetry = this.onDuplicateFailedRetry.bind(this)
      this.onMigrateFailedRetry = this.onMigrateFailedRetry.bind(this)
      this.onDuplicateOrImportFailedCancel = this.onDuplicateOrImportFailedCancel.bind(this)
      this.onDelete = this.onDelete.bind(this)
      this.onSendAssignmentTo = this.onSendAssignmentTo.bind(this)
      this.onCopyAssignmentTo = this.onCopyAssignmentTo.bind(this)
      this.onUnlockAssignment = this.onUnlockAssignment.bind(this)
      this.onLockAssignment = this.onLockAssignment.bind(this)
      this.updateScore = this.updateScore.bind(this)
      this.goToNextItem = this.goToNextItem.bind(this)
      this.goToPrevItem = this.goToPrevItem.bind(this)
      this.editItem = this.editItem.bind(this)
      this.deleteItem = this.deleteItem.bind(this)
      this.addItem = this.addItem.bind(this)
      this.showAssignment = this.showAssignment.bind(this)
      this.assignmentGroupView = this.assignmentGroupView.bind(this)
      this.visibleAssignments = this.visibleAssignments.bind(this)
      this.nextVisibleGroup = this.nextVisibleGroup.bind(this)
      this.nextAssignmentInGroup = this.nextAssignmentInGroup.bind(this)
      this.previousAssignmentInGroup = this.previousAssignmentInGroup.bind(this)
      this.focusOnAssignment = this.focusOnAssignment.bind(this)
      this.focusOnGroup = this.focusOnGroup.bind(this)
      this.focusOnGroupByID = this.focusOnGroupByID.bind(this)
      this.focusOnFirstGroup = this.focusOnFirstGroup.bind(this)
    }

    static initClass() {
      this.mixin(AssignmentKeyBindingsMixin)
      this.optionProperty('userIsAdmin')

      this.prototype.tagName = 'li'
      this.prototype.template = template

      this.child('publishIconView', '[data-view=publish-icon]')
      this.child('lockIconView', '[data-view=lock-icon]')
      this.child('dateDueColumnView', '[data-view=date-due]')
      this.child('dateAvailableColumnView', '[data-view=date-available]')
      this.child('editAssignmentView', '[data-view=edit-assignment]')
      this.child('sisButtonView', '[data-view=sis-button]')

      this.prototype.els = {
        '.al-trigger': '$settingsButton',
        '.edit_assignment': '$editAssignmentButton',
        '.move_assignment': '$moveAssignmentButton'
      }

      this.prototype.events = {
        'click .delete_assignment': 'onDelete',
        'click .duplicate_assignment': 'onDuplicate',
        'click .send_assignment_to': 'onSendAssignmentTo',
        'click .copy_assignment_to': 'onCopyAssignmentTo',
        'click .tooltip_link': preventDefault(function () {}),
        keydown: 'handleKeys',
        mousedown: 'stopMoveIfProtected',
        'click .icon-lock': 'onUnlockAssignment',
        'click .icon-unlock': 'onLockAssignment',
        'click .move_assignment': 'onMove',
        'click .duplicate-failed-retry': 'onDuplicateFailedRetry',
        'click .migrate-failed-retry': 'onMigrateFailedRetry',
        'click .duplicate-failed-cancel': 'onDuplicateOrImportFailedCancel',
        'click .import-failed-cancel': 'onDuplicateOrImportFailedCancel'
      }

      this.prototype.messages = shimGetterShorthand(
        {},
        {
          confirm() {
            return I18n.t('Are you sure you want to delete this assignment?')
          },
          ag_move_label() {
            return I18n.beforeLabel(I18n.t('Assignment Group'))
          }
        }
      )
    }

    className() {
      return `assignment${this.canMove() ? '' : ' sort-disabled'}`
    }

    initialize() {
      super.initialize(...arguments)
      this.initializeChildViews()
      // we need the following line in order to access this view later
      this.model.assignmentView = this

      this.model.on('change:hidden', () => {
        this.toggleHidden()
      })
      this.model.set('disabledForModeration', !this.canEdit())

      if (this.canManage()) {
        this.model.on('change:published', this.updatePublishState)

        // re-render for attributes we are showing
        const attrs = [
          'name',
          'points_possible',
          'due_at',
          'lock_at',
          'unlock_at',
          'modules',
          'published',
          'workflow_state'
        ]
        const observe = attrs.map(attr => `change:${attr}`).join(' ')
        this.model.on(observe, this.render)
      }
      this.model.on('change:submission', () => {
        this.updateScore()
      })

      return this.model.pollUntilFinishedLoading()
    }

    initializeChildViews() {
      this.publishIconView = false
      this.lockIconView = false
      this.sisButtonView = false
      this.editAssignmentView = false
      this.dateAvailableColumnView = false

      if (this.canManage()) {
        this.publishIconView = new PublishIconView({
          model: this.model,
          title: this.model.get('name')
        })
        this.lockIconView = new LockIconView({
          model: this.model,
          unlockedText: I18n.t('%{name} is unlocked. Click to lock.', {
            name: this.model.get('name')
          }),
          lockedText: I18n.t('%{name} is locked. Click to unlock', {name: this.model.get('name')}),
          course_id: this.model.get('course_id'),
          content_id: this.model.get('id'),
          content_type: 'assignment'
        })
        this.editAssignmentView = new CreateAssignmentView({model: this.model})
      }

      this.initializeSisButton()

      this.dateDueColumnView = new DateDueColumnView({model: this.model})
      return (this.dateAvailableColumnView = new DateAvailableColumnView({model: this.model}))
    }

    initializeSisButton() {
      if (
        this.canManage() &&
        this.isGraded() &&
        this.model.postToSISEnabled() &&
        this.model.published()
      ) {
        return (this.sisButtonView = new SisButtonView({
          model: this.model,
          sisName: this.model.postToSISName(),
          dueDateRequired: this.model.dueDateRequiredForAccount(),
          maxNameLengthRequired: this.model.maxNameLengthRequiredForAccount()
        }))
      } else if (this.sisButtonView) {
        this.sisButtonView.remove()
      }
    }

    // Public: Called when move menu item is selected
    //
    // Returns nothing.
    onMove() {
      this.moveTrayProps = {
        title: I18n.t('Move Assignment'),
        items: [
          {
            id: this.model.get('id'),
            title: this.model.get('name')
          }
        ],
        moveOptions: {
          groupsLabel: this.messages.ag_move_label,
          groups: MoveItem.backbone.collectionToGroups(
            this.model.collection.view != null
              ? this.model.collection.view.parentCollection
              : undefined,
            col => col.get('assignments')
          )
        },
        onMoveSuccess: res => {
          const keys = {
            model: 'assignments',
            parent: 'assignment_group_id'
          }
          return MoveItem.backbone.reorderAcrossCollections(
            res.data.order,
            res.groupId,
            this.model,
            keys
          )
        },
        focusOnExit: () => {
          return document.querySelector(`#assignment_${this.model.id} a[id*=manage_link]`)
        },
        formatSaveUrl({groupId}) {
          return `${ENV.URLS.assignment_sort_base_url}/${groupId}/reorder`
        }
      }

      return MoveItem.renderTray(this.moveTrayProps, document.getElementById('not_right_side'))
    }

    updatePublishState() {
      return this.view.$el
        .find('.ig-row')
        .toggleClass('ig-published', this.view.model.get('published'))
    }

    // call remove on children so that they can clean up old dialogs.
    render() {
      this.toggleHidden(this.model, this.model.get('hidden'))
      if (this.publishIconView) {
        this.publishIconView.remove()
      }
      if (this.lockIconView) {
        this.lockIconView.remove()
      }
      if (this.editAssignmentView) {
        this.editAssignmentView.remove()
      }
      if (this.dateDueColumnView) {
        this.dateDueColumnView.remove()
      }
      if (this.dateAvailableColumnView) {
        this.dateAvailableColumnView.remove()
      }

      super.render(...arguments)
      this.initializeSisButton()
      // reset the model's view property; it got overwritten by child views
      if (this.model) {
        return (this.model.view = this)
      }
    }

    afterRender() {
      this.createModuleToolTip()

      if (this.editAssignmentView) {
        this.editAssignmentView.hide()
        if (this.canEdit()) {
          this.editAssignmentView.setTrigger(this.$editAssignmentButton)
        }
      }

      if (this.canReadGrades()) {
        return this.updateScore()
      }
    }

    toggleHidden(model, hidden) {
      this.$el.toggleClass('hidden', hidden)
      return this.$el.toggleClass('search_show', !hidden)
    }

    stopMoveIfProtected(e) {
      if (!this.canMove()) {
        return e.stopPropagation()
      }
    }

    createModuleToolTip() {
      const link = this.$el.find('.tooltip_link')
      if (link.length > 0) {
        return link.tooltip({
          position: {
            my: 'center bottom',
            at: 'center top-10',
            collision: 'fit fit'
          },
          tooltipClass: 'center bottom vertical',
          content() {
            return $(link.data('tooltipSelector')).html()
          }
        })
      }
    }

    toJSON() {
      let modules
      let data = this.model.toView()
      data.canManage = this.canManage()
      if (!data.canManage) {
        data = this._setJSONForGrade(data)
      }

      data.canEdit = this.canEdit()
      data.canShowBuildLink = this.canShowBuildLink()
      data.canMove = this.canMove()
      data.canDelete = this.canDelete()
      data.canDuplicate = this.canDuplicate()
      data.is_locked = this.model.isRestrictedByMasterCourse()
      data.showAvailability =
        this.model.multipleDueDates() || !this.model.defaultDates().available()
      data.showDueDate = this.model.multipleDueDates() || this.model.singleSectionDueDate()

      data.cyoe = CyoeHelper.getItemData(
        data.id,
        this.isGraded() && (!this.model.isQuiz() || data.is_quiz_assignment)
      )
      data.return_to = encodeURIComponent(window.location.pathname)

      data.quizzesRespondusEnabled = this.model.quizzesRespondusEnabled()

      data.DIRECT_SHARE_ENABLED = !!ENV.DIRECT_SHARE_ENABLED
      data.canOpenManageOptions = this.canOpenManageOptions()

      if (data.canManage) {
        data.spanWidth = 'span3'
        data.alignTextClass = ''
      } else {
        data.spanWidth = 'span4'
        data.alignTextClass = 'align-right'
      }

      if (this.model.isQuiz()) {
        data.menu_tools = ENV.quiz_menu_tools || []
        data.menu_tools.forEach(tool => {
          return (tool.url = tool.base_url + `&quizzes[]=${this.model.get('quiz_id')}`)
        })
      } else if (this.model.isDiscussionTopic()) {
        data.menu_tools = ENV.discussion_topic_menu_tools || []
        data.menu_tools.forEach(tool => {
          return (tool.url =
            tool.base_url +
            `&discussion_topics[]=${__guard__(this.model.get('discussion_topic'), x => x.id)}`)
        })
      } else {
        data.menu_tools = ENV.assignment_menu_tools || []
        data.menu_tools.forEach(tool => {
          return (tool.url = tool.base_url + `&assignments[]=${this.model.get('id')}`)
        })
      }

      if ((modules = this.model.get('modules'))) {
        const moduleName = modules[0]
        const has_modules = modules.length > 0
        const joinedNames = modules.join(',')
        return Object.assign(data, {
          modules,
          module_count: modules.length,
          module_name: moduleName,
          has_modules,
          joined_names: joinedNames
        })
      } else {
        return data
      }
    }

    addAssignmentToList(response) {
      if (!response) {
        return
      }
      const assignment = new Assignment(response)
      // Force the positions to match what is in the db.
      this.model.collection.forEach(a => {
        return a.set('position', response.new_positions[a.get('id')])
      })
      if (this.hasIndividualPermissions()) {
        ENV.PERMISSIONS.by_assignment_id[assignment.id] =
          ENV.PERMISSIONS.by_assignment_id[assignment.originalAssignmentID()]
      }
      this.model.collection.add(assignment)
      return this.focusOnAssignment(response)
    }

    addMigratedQuizToList(response) {
      if (!response) {
        return
      }
      const quizzes = response.migrated_assignment
      if (quizzes) {
        return this.addAssignmentToList(quizzes[0])
      }
    }

    onDuplicate(e) {
      if (!this.canDuplicate()) {
        return
      }
      e.preventDefault()
      return this.model.duplicate(this.addAssignmentToList)
    }

    onDuplicateFailedRetry(e) {
      e.preventDefault()
      const $button = $(e.target)
      $button.prop('disabled', true)
      return this.model
        .duplicate_failed(response => {
          this.addAssignmentToList(response)
          return this.delete({silent: true})
        })
        .always(() => $button.prop('disabled', false))
    }

    onMigrateFailedRetry(e) {
      e.preventDefault()
      const $button = $(e.target)
      $button.prop('disabled', true)
      return this.model
        .retry_migration(response => {
          this.addMigratedQuizToList(response)
          return this.delete({silent: true})
        })
        .always(() => $button.prop('disabled', false))
    }

    onDuplicateOrImportFailedCancel(e) {
      e.preventDefault()
      return this.delete({silent: true})
    }

    onDelete(e) {
      e.preventDefault()
      if (!this.canDelete()) {
        return
      }
      if (!confirm(this.messages.confirm)) {
        return this.$el.find('a[id*=manage_link]').focus()
      }
      if (this.previousAssignmentInGroup() != null) {
        this.focusOnAssignment(this.previousAssignmentInGroup())
        return this.delete()
      } else {
        const id = this.model.attributes.assignment_group_id
        this.delete()
        return this.focusOnGroupByID(id)
      }
    }

    onSendAssignmentTo(e) {
      e.preventDefault()
      const renderModal = open => {
        const mountPoint = document.getElementById('send-to-mount-point')
        if (!mountPoint) {
          return
        }
        return ReactDOM.render(
          React.createElement(DirectShareUserModal, {
            open,
            courseId: ENV.COURSE_ID || ENV.COURSE.id,
            contentShare: {content_type: 'assignment', content_id: this.model.id},
            shouldReturnFocus: false,
            onDismiss: dismissModal
          }),
          mountPoint
        )
      }

      const dismissModal = () => {
        renderModal(false)
        // delay necessary because something else is messing with our focus, even with shouldReturnFocus: false
        return setTimeout(() => this.$settingsButton.focus(), 100)
      }

      return renderModal(true)
    }

    onCopyAssignmentTo(e) {
      e.preventDefault()
      const renderTray = open => {
        const mountPoint = document.getElementById('copy-to-mount-point')
        if (!mountPoint) {
          return
        }
        return ReactDOM.render(
          React.createElement(DirectShareCourseTray, {
            open,
            sourceCourseId: ENV.COURSE_ID || ENV.COURSE.id,
            contentSelection: {assignments: [this.model.id]},
            shouldReturnFocus: false,
            onDismiss: dismissTray
          }),
          mountPoint
        )
      }

      const dismissTray = () => {
        renderTray(false)
        // delay necessary because something else is messing with our focus, even with shouldReturnFocus: false
        return setTimeout(() => this.$settingsButton.focus(), 100)
      }

      return renderTray(true)
    }

    onUnlockAssignment(e) {
      return e.preventDefault()
    }

    onLockAssignment(e) {
      return e.preventDefault()
    }

    delete(opts) {
      if (opts == null) {
        opts = {silent: false}
      }
      const callbacks = {}
      if (!opts.silent) {
        callbacks.success = () => $.screenReaderFlashMessage(I18n.t('Assignment was deleted'))
      }
      this.model.destroy(callbacks)
      return this.$el.remove()
    }

    hasIndividualPermissions() {
      return ENV.PERMISSIONS.by_assignment_id != null
    }

    canDelete() {
      const modelResult =
        (this.userIsAdmin || this.model.canDelete()) && !this.model.isRestrictedByMasterCourse()
      const userResult = this.hasIndividualPermissions()
        ? !!(ENV.PERMISSIONS.by_assignment_id[this.model.id] != null
            ? ENV.PERMISSIONS.by_assignment_id[this.model.id].delete
            : undefined)
        : ENV.PERMISSIONS.manage_assignments_delete
      return modelResult && userResult
    }

    canDuplicate() {
      return (this.userIsAdmin || this.canAdd()) && this.model.canDuplicate()
    }

    canMove() {
      return this.userIsAdmin || (this.canManage() && this.model.canMove())
    }

    canEdit() {
      if (!this.hasIndividualPermissions()) {
        return this.userIsAdmin || this.canManage()
      }

      return (
        this.userIsAdmin ||
        (this.canManage() &&
          !!(ENV.PERMISSIONS.by_assignment_id[this.model.id] != null
            ? ENV.PERMISSIONS.by_assignment_id[this.model.id].update
            : undefined))
      )
    }

    canAdd() {
      return ENV.PERMISSIONS.manage_assignments_add
    }

    canManage() {
      return ENV.PERMISSIONS.manage
    }

    canShowBuildLink() {
      return !!(
        ENV.FLAGS &&
        ENV.FLAGS.new_quizzes_skip_to_build_module_button &&
        this.model.isQuizLTIAssignment()
      )
    }

    canOpenManageOptions() {
      return this.canManage() || this.canAdd() || this.canDelete() || ENV.DIRECT_SHARE_ENABLED
    }

    isGraded() {
      const submission_types = this.model.get('submission_types')
      return (
        submission_types &&
        !submission_types.includes('not_graded') &&
        !submission_types.includes('wiki_page')
      )
    }

    gradeStrings(grade) {
      const pass_fail_map = {
        incomplete: I18n.t('incomplete', 'Incomplete'),
        complete: I18n.t('complete', 'Complete')
      }

      grade = pass_fail_map[grade] || grade

      return {
        percent: {
          nonscreenreader: I18n.t('grade_percent', '%{grade}%', {grade}),
          screenreader: I18n.t('grade_percent_screenreader', 'Grade: %{grade}%', {grade})
        },
        pass_fail: {
          nonscreenreader: `${grade}`,
          screenreader: I18n.t('grade_pass_fail_screenreader', 'Grade: %{grade}', {grade})
        },
        letter_grade: {
          nonscreenreader: `${grade}`,
          screenreader: I18n.t('grade_letter_grade_screenreader', 'Grade: %{grade}', {grade})
        },
        gpa_scale: {
          nonscreenreader: `${grade}`,
          screenreader: I18n.t('grade_gpa_scale_screenreader', 'Grade: %{grade}', {grade})
        }
      }
    }

    _setJSONForGrade(json) {
      let submission
      if ((submission = this.model.get('submission'))) {
        const submissionJSON = submission.present ? submission.present() : submission.toJSON()
        const score = submission.get('score')
        if (typeof score === 'number' && !Number.isNaN(score)) {
          submissionJSON.score = round(score, round.DEFAULT)
        }
        json.submission = submissionJSON
        const grade = submission.get('grade')
        const gradeString = this.gradeStrings(grade)[json.gradingType]
        json.submission.gradeDisplay = gradeString != null ? gradeString.nonscreenreader : undefined
        json.submission.gradeDisplayForScreenreader =
          gradeString != null ? gradeString.screenreader : undefined
      }

      const {pointsPossible} = json

      if (typeof pointsPossible === 'number' && !Number.isNaN(pointsPossible)) {
        json.pointsPossible = round(pointsPossible, round.DEFAULT)
        if (json.submission != null) {
          json.submission.pointsPossible = json.pointsPossible
        }
      }

      if (json.submission != null) {
        json.submission.gradingType = json.gradingType
      }

      if (json.gradingType === 'not_graded') {
        json.hideGrade = true
      }
      return json
    }

    updateScore() {
      let json = this.model.toView()
      if (!this.canManage()) {
        json = this._setJSONForGrade(json)
      }
      return this.$('.js-score').html(scoreTemplate(json))
    }

    canReadGrades() {
      return ENV.PERMISSIONS.read_grades
    }

    goToNextItem() {
      if (this.nextAssignmentInGroup() != null) {
        return this.focusOnAssignment(this.nextAssignmentInGroup())
      } else if (this.nextVisibleGroup() != null) {
        return this.focusOnGroup(this.nextVisibleGroup())
      } else {
        return this.focusOnFirstGroup()
      }
    }

    goToPrevItem() {
      if (this.previousAssignmentInGroup() != null) {
        return this.focusOnAssignment(this.previousAssignmentInGroup())
      } else {
        return this.focusOnGroupByID(this.model.attributes.assignment_group_id)
      }
    }

    editItem() {
      return this.$(`#assignment_${this.model.id}_settings_edit_item`).click()
    }

    deleteItem() {
      return this.$(`#assignment_${this.model.id}_settings_delete_item`).click()
    }

    addItem() {
      const group_id = this.model.attributes.assignment_group_id
      return $('.add_assignment', `#assignment_group_${group_id}`).click()
    }

    showAssignment() {
      return $('.ig-title', `#assignment_${this.model.id}`)[0].click()
    }

    assignmentGroupView() {
      return this.model.collection.view
    }

    visibleAssignments() {
      return this.assignmentGroupView().visibleAssignments()
    }

    nextVisibleGroup() {
      return this.assignmentGroupView().nextGroup()
    }

    nextAssignmentInGroup() {
      const current_assignment_index = this.visibleAssignments().indexOf(this.model)
      return this.visibleAssignments()[current_assignment_index + 1]
    }

    previousAssignmentInGroup() {
      const current_assignment_index = this.visibleAssignments().indexOf(this.model)
      return this.visibleAssignments()[current_assignment_index - 1]
    }

    focusOnAssignment(assignment) {
      return $(`#assignment_${assignment.id}`).attr('tabindex', -1).focus()
    }

    focusOnGroup(group) {
      return $(`#assignment_group_${group.attributes.id}`).attr('tabindex', -1).focus()
    }

    focusOnGroupByID(group_id) {
      return $(`#assignment_group_${group_id}`).attr('tabindex', -1).focus()
    }

    focusOnFirstGroup() {
      return $('.assignment_group').filter(':visible').first().attr('tabindex', -1).focus()
    }
  }
  AssignmentListItemView.initClass()
  return AssignmentListItemView
})()

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined
}
