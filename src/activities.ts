import mailgun from 'mailgun-js';

export const createActivities = (mg: mailgun.Messages, from: string) => ({
  async sendAbandonedCartEmail(to: string): Promise<void> {
    const data = {
      to,
      from,
      subject: 'You\'ve abandoned your shopping cart!',
      html: 'Go to http://localhost:8080 to finish checking out!',
    };

    await mg.send(data);
  },
});