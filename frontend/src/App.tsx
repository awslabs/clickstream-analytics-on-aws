/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import CommonAlert from 'components/common/alert';
import Footer from 'components/layouts/Footer';
import Header from 'components/layouts/Header';
import CreateApplication from 'pages/application/create/CreateApplication';
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
                  path="/project/:pid/pipeline/:id"
                  element={<PipelineDetail />}
                />
                <Route
                  path="/project/:projectId/pipelines/create"
                  element={<CreatePipeline />}
                />
                <Route path="/pipelines/create" element={<CreatePipeline />} />
                <Route
                  path="/project/:id/application/create"
                  element={<CreateApplication />}
                />
              </Routes>
            </div>
          </Suspense>
        </div>
        <CommonAlert />
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
