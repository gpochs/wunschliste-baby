import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY || 'placeholder_key'
const resend = new Resend(resendApiKey)

export { resend }
