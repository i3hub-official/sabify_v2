// src/lib/services/index.ts
// Central export for all services

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  verifyEmailConnection,
} from './email.service.js'

export {
  getNotificationService,
  sendPush,
  sendSafetyAlertPush,
  registerDeviceToken,
  unregisterDeviceToken,
} from './notification.service.js'
export { getPaymentService, initializePayment, verifyPayment } from './payment.service.js'
export { generateQRCode, parseQRCode, computeVerifyHash, verifyQRHash } from './qr.service.js'
export { searchUniversities, searchCourses, searchPrograms } from './search.service.js'
export { sendSMS, sendOTP, verifySMSToken } from './sms.service.js'
export { uploadFile, deleteFile, getFileUrl } from './storage.service.js'