import './main.css';
import './style_v7.css';

export default function Header() {
    return (
<body>
  <div className="other-header">
    <div className="header-title">SGXP</div>
    <div className="slogan">
      <div onclick="GetRandomMsg()" className="inner-slogan">
        <div className="unselectable-text" id="message" />
      </div>
    </div>
  </div>
  <nav className="navbar" id="navbar">
    <div className="topnav">
      <a href="./">HOME</a>
      <a href="./comics.php">COMICS</a>
      <a href="./sprites.html">SPRITES</a>
      <a href="./Projects">FORUM</a>
      <div className="dropdown">
        <a className="dropbtn" href="./extras.php">
          EXTRAS
        </a>
        <div className="dropdown-content">
          <a href="./rave/rave.php">RAVE</a>
          <a href="./metal-sonic.php">METAL</a>
        </div>
      </div>
      <div className="select">
        <select name="themeSelect" id="themeSelect">
          <option value="style_v6">DOOMSDAY ZONE</option>
          <option value="hpz">HIDDEN PALACE ZONE</option>
          <option value="mfz">MFZ</option>
          <option value="ssz">SKY SANCTUARY ZONE</option>
        </select>
      </div>
    </div>
  </nav>
</body>
    );
}

export function Content () {
  return (
  <body>
    <div className="container">
      <div className="header" />
      <div className="sidebar">
        <div className="sidebar-box">Sidebar</div>
        <div className="sidebar-box">Sidebar</div>
        <div className="sidebar-box">Sidebar</div>
      </div>
      <div className="main-content">
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              This is a test Post
              <br />
              This is an actual test of the font: with a couple:of colons
            </span>
          </div>
        </div>
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              Main Content Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Nihil vero at veniam itaque ipsa consectetur. Accusantium quisquam
              sapiente cum debitis hic ex ea nobis eius quod, corporis fugit nemo
              quam! Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Sapiente id esse non iure, sequi temporibus voluptatem aperiam sit
              velit fugit necessitatibus autem at optio sint quo, repellendus
              perspiciatis provident natus?
            </span>
          </div>
        </div>
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              Main Content Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Nihil vero at veniam itaque ipsa consectetur. Accusantium quisquam
              sapiente cum debitis hic ex ea nobis eius quod, corporis fugit nemo
              quam! Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Sapiente id esse non iure, sequi temporibus voluptatem aperiam sit
              velit fugit necessitatibus autem at optio sint quo, repellendus
              perspiciatis provident natus?
            </span>
          </div>
        </div>
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              Main Content Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Nihil vero at veniam itaque ipsa consectetur. Accusantium quisquam
              sapiente cum debitis hic ex ea nobis eius quod, corporis fugit nemo
              quam! Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Sapiente id esse non iure, sequi temporibus voluptatem aperiam sit
              velit fugit necessitatibus autem at optio sint quo, repellendus
              perspiciatis provident natus?
            </span>
          </div>
        </div>
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              Main Content Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Nihil vero at veniam itaque ipsa consectetur. Accusantium quisquam
              sapiente cum debitis hic ex ea nobis eius quod, corporis fugit nemo
              quam! Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Sapiente id esse non iure, sequi temporibus voluptatem aperiam sit
              velit fugit necessitatibus autem at optio sint quo, repellendus
              perspiciatis provident natus?
            </span>
          </div>
        </div>
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              Main Content Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Nihil vero at veniam itaque ipsa consectetur. Accusantium quisquam
              sapiente cum debitis hic ex ea nobis eius quod, corporis fugit nemo
              quam! Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Sapiente id esse non iure, sequi temporibus voluptatem aperiam sit
              velit fugit necessitatibus autem at optio sint quo, repellendus
              perspiciatis provident natus?
            </span>
          </div>
        </div>
        <div className="main-content-box">
          <div className="news">
            <div className="news-img">
              <img src="static\img\a3a4b140dda3d8543d30ae2dee8bf565.png" alt="" />
            </div>
            <div className="news-user">Xypter</div>
            <div className="news-date">November 9 at 5:44 PM</div>
            <span className="news-content">
              <a className="sexy-link" href="#">
                {" "}
                What's gucci cuh
              </a>{" "}
              Main Content Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Nihil vero at veniam itaque ipsa consectetur. Accusantium quisquam
              sapiente cum debitis hic ex ea nobis eius quod, corporis fugit nemo
              quam! Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Sapiente id esse non iure, sequi temporibus voluptatem aperiam sit
              velit fugit necessitatibus autem at optio sint quo, repellendus
              perspiciatis provident natus?
            </span>
          </div>
        </div>
      </div>
    </div>
  </body>
  );
}