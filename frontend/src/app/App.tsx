import React, { useContext } from "react";
import '@fontsource/roboto';
import '@fontsource/roboto/300.css'; // Light
import '@fontsource/roboto/400.css'; // Regular
import '@fontsource/roboto/500.css'; // Medium
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ApplicationContext, ApplicationContextProvider } from "./ApplicationContextProvider.tsx";
import { Profile } from "../pages/Profile.tsx";
import { ExplainWorkload } from "../pages/ExplainWorkload.tsx";
import { ThemeProvider } from '@mui/material/styles';
import { PageError } from "../pages/PageError.tsx";
import { Chat } from "../pages/Chat.tsx";
import SideBar from "./SideBar.tsx";
import { ToastProvider } from "../components/ToastProvider.tsx";
import { darkTheme, lightTheme } from "../styles/theme.tsx";
import { FootprintContextProvider } from "./FootprintContextProvider.tsx";
import { ExplainContextProvider } from "./ExplainContextProvider.tsx";
import { ExplainNamespace } from "../pages/ExplainNamespace.tsx";
import { Scores } from "../pages/Scores.tsx";
import { ConfirmationDialogProvider } from "../components/ConfirmationDialogProvider.tsx";
import { ExplainCluster } from "../pages/ExplainCluster.tsx";
import { FactsCluster } from "../pages/FactsCluster.tsx";
import { FactsNamespace } from "../pages/FactsNamespace.tsx";
import { FactsWorkload } from "../pages/FactsWorkload.tsx";
import { ProtectedRoute } from "../components/ProtectedRoute.tsx";
import { DocumentLibrary } from "../pages/DocumentLibrary.tsx";
import { AgentHub } from "../pages/AgentHub.tsx";

function MainContent({ }) {
  const applicationContext = useContext(ApplicationContext); // Access the ApplicationContext
  const darkMode = applicationContext.darkMode; // Get the dark mode setting from the context
  return (
    <>
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        {/* Render the SideBar only if it's not the login page */}
        {<SideBar darkMode={darkMode} onThemeChange={applicationContext.toggleDarkMode} />}

        {/* Main content */}
        <Routes>
          {/* Home Route (no clusterName required) */}
          <Route path="/" element={<ProtectedRoute permission={"viewer"} />}>
            <Route path="" element={<FootprintContextProvider><Chat /></FootprintContextProvider>} />
          </Route>

         {/*  <Route path="/explain" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<ExplainContextProvider><Explain /></ExplainContextProvider>} />
          </Route>
          <Route path="/facts" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<ExplainContextProvider><Facts /></ExplainContextProvider>} />
          </Route>

          <Route path="/audit" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<Audit />} />
          </Route>

          <Route path="/debug" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<FootprintContextProvider><Debug></Debug></FootprintContextProvider>} />
          </Route>

          <Route path="/inspect" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<FootprintContextProvider><Inspect /></FootprintContextProvider>} />
          </Route>
 */}
          <Route path="/chat" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<Chat />} />
          </Route>

         {/*  <Route path="/optimize" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<Optimize />} />
          </Route>

          <Route path="/geomap" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<Geomap />} />
          </Route>  */}

          <Route path="/profile" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<Profile />} />
          </Route>

          <Route path="/documentLibrary" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<DocumentLibrary />} />
          </Route>


         <Route path="/agentHub" element={<ProtectedRoute permission={"viewer"} />}>
            <Route index element={<AgentHub />} />
          </Route>
          <Route path="/score/:cluster/:namespace/:application" element={<Scores />} />
          <Route path="/facts-workload" element={<FactsWorkload />} />
          <Route path="/facts-cluster" element={<FactsCluster />} />
          <Route path="/facts-namespace" element={<FactsNamespace />} />
          <Route path="/explain-cluster" element={<ExplainCluster />} />
          <Route path="/explain-namespace" element={<ExplainNamespace />} />
          <Route path="/explain-workload" element={<ExplainContextProvider><ExplainWorkload /></ExplainContextProvider>} />

          {/* Redirect for invalid paths */}
          <Route path="*" element={<PageError />} />
        </Routes> 
      </ThemeProvider>
    </>
  );
}

function FredUi() {
  return (
    <React.Suspense fallback={<div>Loading</div>}>
      <ToastProvider>
          <ConfirmationDialogProvider>
            <Router>
              <ApplicationContextProvider>
                <MainContent />
              </ApplicationContextProvider>
            </Router>
          </ConfirmationDialogProvider>
      </ToastProvider>
    </React.Suspense>
  );
}

export default FredUi;
