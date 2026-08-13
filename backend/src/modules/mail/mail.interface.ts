export const MAILER = Symbol('MAILER');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  messageId?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
