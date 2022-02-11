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
import {fireEvent, render} from '@testing-library/react'

import {COURSE, BLACKOUT_DATES} from '../../../__tests__/fixtures'

import PacePlanDateInput, {PacePlansDateInputProps} from '../pace_plan_date_input'
import moment from 'moment'

beforeAll(() => {
  window.ENV.VALID_DATE_RANGE = {
    end_at: {date: COURSE.end_at, date_context: 'course'},
    start_at: {date: COURSE.start_at, date_context: 'course'}
  }
  window.ENV.CONTEXT_TIMEZONE = 'Asia/Tokyo'
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('PacePlansDateSelector', () => {
  const defaultProps: PacePlansDateInputProps = {
    dateValue: COURSE.start_at,
    label: 'The Label',
    helpText: 'help text',
    message: undefined,
    onDateChange: jest.fn(),
    validateDay: jest.fn(),
    interaction: 'enabled',
    width: '100%',
    weekendsDisabled: true,
    blackoutDates: BLACKOUT_DATES,
    startDate: moment(COURSE.start_at),
    endDate: moment(COURSE.start_at).add(7, 'days')
  }

  it('renders an editable selector for primary pace plans', () => {
    const {queryAllByText, getByLabelText} = render(<PacePlanDateInput {...defaultProps} />)
    const startDateInput = getByLabelText(/^The Label/) as HTMLInputElement
    const helpText = queryAllByText(/help text/)
    expect(startDateInput).toBeInTheDocument()
    expect(helpText.length).toBeTruthy()
    expect(startDateInput.value).toBe('September 1, 2021')

    fireEvent.change(startDateInput, {target: {value: 'September 3, 2021'}})
    fireEvent.blur(startDateInput)
    expect(defaultProps.onDateChange).toHaveBeenCalledWith('2021-09-03')
  })

  it('renders read-only text when asked', () => {
    const {getByText, queryByRole} = render(
      <PacePlanDateInput {...defaultProps} interaction="readonly" />
    )
    expect(getByText('The Label')).toBeInTheDocument()
    expect(getByText('September 1, 2021')).toBeInTheDocument()
    expect(queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('displays an error when weekends are disallowed and the date is on a weekend', () => {
    const {getByText} = render(<PacePlanDateInput {...defaultProps} dateValue="2021-09-04" />)

    expect(
      getByText('The selected date is on a weekend and this pace plan skips weekends.')
    ).toBeInTheDocument()
  })

  it('displays an error when the date is on a blackout date', () => {
    const blackoutDates = [
      {
        event_title: 'Student Break',
        start_date: moment('September 2, 2021'),
        end_date: moment('September 10, 2021')
      }
    ]
    const {getByText} = render(
      <PacePlanDateInput {...defaultProps} dateValue="2021-09-04" blackoutDates={blackoutDates} />
    )

    expect(getByText('The selected date is on a blackout day.')).toBeInTheDocument()
  })

  it('displays an error when the date is before the start date', () => {
    const {getByText} = render(<PacePlanDateInput {...defaultProps} dateValue="2021-08-30" />)

    expect(getByText('The selected date is too early.')).toBeInTheDocument()
  })

  it('displays an error when the date is after the end date', () => {
    const {getByText} = render(<PacePlanDateInput {...defaultProps} dateValue="2021-10-30" />)

    expect(getByText('The selected date is too late.')).toBeInTheDocument()
  })

  it('renders as disabled while publishing', () => {
    const {getByLabelText} = render(<PacePlanDateInput {...defaultProps} interaction="disabled" />)
    const startDateInput = getByLabelText(/^The Label/) as HTMLInputElement

    expect(startDateInput).toBeDisabled()
  })
})
