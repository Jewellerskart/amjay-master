import { FRONTEND_URL, signInPageUrl } from '@variable';
import { ScriptSrc } from '@common/Scripts';
import '@styles/pages/landing-page.scss';
export const LandingPage = () => {
  return (
    <>
      <ScriptSrc />
      <div className="landing-page">
        <header>
          <div className="container">
            <a href="#" className="logo mt-5">
              <img src={`${FRONTEND_URL}/logo/amjay-logo-1.png`} />
            </a>
            <ul className="links">
              <li>Home</li>
              <li>About Us</li>
              <li>Work</li>
              <li>Info</li>
              <li>
                <a href={signInPageUrl}>Get Started</a>
              </li>
            </ul>
          </div>
        </header>
        <div className="content">
          <div className="container">
            <div className="info">
              <h1>Looking For Inspiration</h1>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellendus odit nihil ullam nesciunt quidem iste, Repellendus odit nihil</p>
              <button>Button name</button>
            </div>
            <div className="image">
              <img src="https://i.postimg.cc/65QxYYzh/001234.png" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
