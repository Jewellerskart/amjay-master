import { MailLink, PhoneLink, whatsappLink } from '@variable';

export const Footer = () => {
  return (
    <div className="footer">
      <div className="copyright">
        <p className="mb-2">
          Copyright &copy; {new Date().getFullYear()} Built by
          <span className="mx-2">AMJAY</span>
        </p>
        <div className="footer-contact row justify-content-center">
          <a href={whatsappLink} className="mx-2" aria-label="WhatsApp">
            <i className="fa fa-whatsapp"></i>
          </a>
          <a href={MailLink} className="mx-2" aria-label="Email">
            <i className="icon-envelope-open"></i>
          </a>
          <a href={PhoneLink} className="mx-2" aria-label="Phone">
            <i className="fa fa-phone"></i>
          </a>
        </div>
      </div>
    </div>
  );
};
