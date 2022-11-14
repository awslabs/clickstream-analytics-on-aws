import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer id="f">
      <ul>
        <li>
          <a href="/about/about-cloudscape/">About</a>
        </li>
        <li>
          <a href="/about/connect/">Connect</a>
        </li>
        <li>
          © {new Date().getFullYear()}, Amazon Web Services, Inc. or its
          affiliates. All rights reserved.
        </li>
      </ul>
    </footer>
  );
};

export default Footer;
