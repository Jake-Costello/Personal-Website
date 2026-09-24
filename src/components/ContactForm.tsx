export default function ContactForm({ endpoint }: { endpoint: string }) {
  return (
    <form
      id="contact-form"
      className="contact-form"
      action={endpoint}
      method="POST"
      acceptCharset="UTF-8"
      aria-label="Send Jake a message"
      aria-describedby="contact-privacy"
    >
      <div className="contact-fields">
        <label htmlFor="contact-name">
          Your name
          <input id="contact-name" name="name" autoComplete="name" maxLength={100} required />
        </label>
        <label htmlFor="contact-reply">
          Your email
          <input
            id="contact-reply"
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>
      <label htmlFor="contact-message">
        What are you working on?
        <textarea id="contact-message" name="message" rows={5} maxLength={4000} required />
      </label>
      <div className="contact-trap" aria-hidden="true">
        <label htmlFor="contact-website">
          Leave this field empty
          <input id="contact-website" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p id="contact-privacy" className="contact-note">
        Your name, reply address, and message are sent through Formspree so I can reply. You may be
        asked to complete a security check before sending.{' '}
        <a href="https://formspree.io/legal/privacy-policy/" target="_blank" rel="noreferrer">
          Formspree privacy policy
        </a>
      </p>
      <button className="button button-dark" type="submit">
        Continue to send <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
