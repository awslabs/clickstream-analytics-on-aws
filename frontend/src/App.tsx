import Footer from 'components/layouts/Footer';
import Header from 'components/layouts/Header';
import Projects from 'pages/projects/Projects';
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/home/Home';

interface SignedInPageProps {
  user: any;
  signOut: any;
}

const App: React.FC = () => {
  const SignedInPage: React.FC<SignedInPageProps> = ({
    user,
    signOut,
  }: SignedInPageProps) => {
    return (
      <Router>
        <div id="b">
          <Header user={user} signOut={signOut} />
          <Suspense fallback={null}>
            <div id="app">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/projects" element={<Projects />} />
              </Routes>
            </div>
          </Suspense>
        </div>
        <Footer />
      </Router>
    );
  };

  return (
    <div className="App">
      <SignedInPage signOut={null} user={null} />
    </div>
  );
};

export default App;
