import { Request, CookieOptions } from 'express'
export const CookOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development',
  sameSite: process.env.NODE_ENV === 'development' ? undefined : 'none',
}

export class Generator {
  static OTP = (length: number = 6): string => {
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)]
    }
    return otp
  }

  static String = (length: number = 10): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }
}
export class Formatting {
  static TimeDate = (mongoDBDateString: string) => {
    const date = new Date(mongoDBDateString)

    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const day = date.getUTCDate()
    const month = date.getUTCMonth()

    const formattedHours = hours % 12 || 12
    const formattedMinutes = minutes.toString().padStart(2, '0')
    const AmPm = hours >= 12 ? 'pm' : 'am'

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const formattedMonth = monthNames[month]

    return `${formattedHours}:${formattedMinutes} ${AmPm} ${day} ${formattedMonth}`
  }
  static Date = (product: string) => {
    const date = product ? new Date(product) : new Date(new Date().toISOString())

    const day = date?.getDate()
    const ordinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd']
      const v = n % 100
      return s[(v - 20) % 10] || s[v] || s[0]
    }

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
    })?.format(date)

    return `${day}${ordinal(day)} ${formattedDate}`
  }
  static truncateString = (text: string, maxLength: number) => {
    if (!text) {
      return 'Something went Wrong! Unable to find it'
    }
    return text?.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
}
export class Variables {
  static readonly Roles = { 1: 'INTERN', 2: 'ATL', 3: 'TL', 4: 'MANAGER', 5: 'DIRECTOR' }
  static readonly Access = { 1: 'TYPE-001', 2: 'TYPE-002', 3: 'TYPE-003' }
}

export class RequestData {
  static PreData = (data: Request) => {
    const page = parseInt((data?.body?.page as string) || '1', 10)
    const limit = parseInt((data?.body?.limit as string) || '10', 10)

    const sortField = (data?.body?.sort as string) || '_id' // default sort field
    const order = ['asc', 'desc'].includes((data?.body?.order || '').toLowerCase())
      ? data.body.order.toLowerCase()
      : 'desc'

    // MongoDB expects 1 for ASC, -1 for DESC
    const sort: Record<string, 1 | -1> = {
      [sortField]: order === 'asc' ? 1 : -1,
    }

    return { page, limit, sort }
  }
}

import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true })
  } catch {
    // ignore mkdir errors
  }
}
const logFilePath = path.join(logDir, 'app.log')

export function customLog(message: any) {
  try {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${JSON.stringify(message)}\n`
    if (message !== 'Database has been connected') {
      fs.appendFileSync(logFilePath, logEntry, 'utf8')
    }
  } catch (err) {
    console.error('Logging failed', err)
  }
}

export function getLogs() {
  try {
    if (!fs.existsSync(logFilePath)) {
      return []
    }
    const logs = fs.readFileSync(logFilePath, 'utf8').trim().split('\n')

    // Return as structured objects
    return logs.map((line) => {
      const match = line.match(/^\[(.*?)\]\s(.*)$/)
      if (!match) return { timestamp: null, message: line }

      const [, timestamp, rawMessage] = match
      let message
      try {
        message = JSON.parse(rawMessage)
      } catch {
        message = rawMessage
      }
      return { [timestamp]: message }
    })
  } catch (err) {
    console.error('Failed to read logs:', err)
    return
  }
}
export const CurrentFinYear = () => {
  const year = new Date().getFullYear()
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`
}
