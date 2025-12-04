import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-brand-footer mt-auto py-3">
      <Container className="text-center text-white small">
        © UNI Med Solutions {new Date().getFullYear()}
      </Container>
    </footer>
  );
};

export default Footer;
