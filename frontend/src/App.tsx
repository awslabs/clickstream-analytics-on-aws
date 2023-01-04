import Footer from 'components/layouts/Footer';
import Header from 'components/layouts/Header';
import PipelineList from 'pages/pipelines/PipelineList';
import CreatePipeline from 'pages/pipelines/create/CreatePipeline';
import PipelineDetail from 'pages/pipelines/detail/PipelineDetail';
import Projects from 'pages/projects/Projects';
import ProjectDetail from 'pages/projects/detail/ProjectDetail';
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
                <Route path="/project/detail/:id" element={<ProjectDetail />} />
                <Route path="/pipelines" element={<PipelineList />} />
                <Route
                  path="/pipeline/detail/:id"
                  element={<PipelineDetail />}
                />
                <Route path="/pipelines/create" element={<CreatePipeline />} />
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
