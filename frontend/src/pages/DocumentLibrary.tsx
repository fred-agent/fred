// Description: Document Library page for uploading and managing documents
// This page allows users to upload documents, search for documents, and filter documents by agent.
// It also provides a drawer for uploading documents and a card view for displaying document information.

import { PageBodyWrapper } from "../common/PageBodyWrapper";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Typography,
  useTheme,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  OutlinedInput,
  Button,
  IconButton,
  InputAdornment,
  Pagination,
  Drawer,
  Container,
  Paper,
  Grid2,
  Fade,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { useCallback, useEffect, useState } from "react";
import { DocumentCard } from "../components/DocumentCard";
import { LoadingSpinner } from "../utils/loadingSpinner";
import UploadIcon from '@mui/icons-material/Upload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import { KeyCloakService } from "../security/KeycloakService";
import {
  useDeleteDocumentMutation,
  useGetDocumentsWithFilterMutation
} from "../slices/documentApi";
import { useGetChatBotAgenticFlowsMutation } from "../slices/chatApi";
import { streamProcessDocument } from "../slices/streamDocumentUpload";
import { useToast } from "../components/ToastProvider";
import { ProgressStep, ProgressStepper } from "../components/ProgressStepper";
export const DocumentLibrary = () => {
  const { showInfo, showError, showWarning } = useToast();

  // API Hooks
  const [deleteDocument] = useDeleteDocumentMutation();
  const [getDocumentsWithFilter] = useGetDocumentsWithFilterMutation();
  const [getAgenticFlows] = useGetChatBotAgenticFlowsMutation();

  const theme = useTheme();

  const hasDocumentManagementPermission = () => {
    const userRoles = KeyCloakService.GetUserRoles();
    return userRoles.includes("admin") || userRoles.includes("editor");
  };

  // If the user does not select an agent all files will be shown
  // If the user selects an agent, only the files related to that agent will be shown. This page will
  // show these files, the search capability will be limited to the files related to that agent.
  const [currentAgentFiles, setCurrentAgentFiles] = useState([]);

  // tempFiles:
  // This state holds the list of files that the user has selected or dropped into the upload drawer.
  // These files are pending upload to the server and are not yet part of the main document library.
  // - Files are added to tempFiles when dropped or selected via the Dropzone.
  // - They are displayed inside the Upload Drawer for review or removal.
  // - Upon clicking "Save", files from tempFiles are uploaded to the server.
  // - After upload completes (success or failure), tempFiles is cleared.
  // This ensures a clear separation between "pending uploads" and "uploaded documents."
  const [tempFiles, setTempFiles] = useState([]);

  // UI States
  const [uploadProgressSteps, setUploadProgressSteps] = useState<ProgressStep[]>([]);

  const [searchQuery, setSearchQuery] = useState(""); // Text entered in the search bar
  const [isLoading, setIsLoading] = useState(false); // Controls loading spinner for fetches/uploads
  const [isHighlighted, setIsHighlighted] = useState(false); // Highlight state for the upload Dropzone
  const [documentsPerPage, setDocumentsPerPage] = useState(10); // Number of documents shown per page
  const [currentPage, setCurrentPage] = useState(1); // Current page in the pagination component
  const [agentFilter, setAgentFilter] = useState(null); // Selected agent for filtering document list
  const [currentAgent, setCurrentAgent] = useState(''); // Selected agent in the upload drawer
  const [openSide, setOpenSide] = useState(false); // Whether the upload drawer is open
  const [showElements, setShowElements] = useState(false); // Controls whether page elements are faded in

  // Backend Data States
  const [agenticFlows, setAgenticFlows] = useState([]); // List of available agents fetched from backend
  const [currentAgenticFlow, setCurrentAgenticFlow] = useState(null); // Currently selected agent flow object

  // userInfo:
  // Stores information about the currently authenticated user.
  // - name: username retrieved from Keycloak
  // - canManageDocuments: boolean, true if user has admin/editor role
  // - roles: list of user's assigned roles
  // 
  // This allows the UI to adjust behavior (e.g., show/hide upload button) based on user permissions.
  const [userInfo, setUserInfo] = useState({
    name: KeyCloakService.GetUserName(),
    canManageDocuments: hasDocumentManagementPermission(),
    roles: KeyCloakService.GetUserRoles()
  });


  const { getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles) => {
      setTempFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    },
  });


  useEffect(() => {
    setShowElements(true);
    setUserInfo({
      name: KeyCloakService.GetUserName(),
      canManageDocuments: hasDocumentManagementPermission(),
      roles: KeyCloakService.GetUserRoles()
    });
  }, []);

  useEffect(() => {
    getAgenticFlows().then((response) => {
      setAgenticFlows(response.data);
      if (response.data && response.data.length > 0) {
        setCurrentAgenticFlow(response.data[0]);
      }
    });
  }, [getAgenticFlows]);

  useEffect(() => {
    if (currentAgenticFlow) {
      setCurrentAgent(currentAgenticFlow.nickname);
    }
  }, [currentAgenticFlow]);

  useEffect(() => {
    fetchFiles();
  }, [agentFilter, getDocumentsWithFilter]);

  // Event handlers
  const handleChangeAgent = (event) => {
    setCurrentAgent(event.target.value);
    setCurrentPage(1); // good idea to reset page too
  };

  const handleChangeAgentFilter = (event) => {
    setAgentFilter(event.target.value);
  };

  const handleDelete = async (document_uid: string) => {
    try {
      await deleteDocument(document_uid).unwrap();
      showInfo({
        summary: "Delete Success",
        detail: `Document ${document_uid} deleted`,
        duration: 3000,
      });

      // Remove from local state too
      const newFiles = currentAgentFiles.filter((file) => file.document_uid !== document_uid);
      setCurrentAgentFiles(newFiles);

      /* setFilteredFiles((prev) =>
        prev.filter((file) => file.document_uid !== document_uid)
      ); */

    } catch (error) {
      showError({
        summary: "Delete Failed",
        detail: `Could not delete document: ${error?.data?.detail || error.message}`,
      });
    }
  };

  const handleDeleteTemp = (index) => {
    const newFiles = tempFiles.filter((_, i) => i !== index);
    setTempFiles(newFiles);
  };

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = agentFilter?.trim()
        ? { front_metadata: { agent_name: agentFilter } }
        : {};
      const response = await getDocumentsWithFilter(filters).unwrap();
      setCurrentAgentFiles(response.documents);
      console.log("Setting current agent files to:", response.documents); // <-- ADD THIS
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentFilter, getDocumentsWithFilter]);

  const handleAddFiles = async () => {
    setIsLoading(true);
    setUploadProgressSteps([]);
    try {
      if (!currentAgenticFlow) {
        showWarning({ summary: 'Agent not selected', detail: 'Please select an agent before uploading documents' });
        setIsLoading(false);
        return;
      }
      const agent_name = currentAgenticFlow.nickname;
      let uploadCount = 0;
      for (const file of tempFiles) {
        try {
          await streamProcessDocument(file, agent_name, (progress) => {
            setUploadProgressSteps((prev) => [
              ...prev,
              { step: progress.step, status: progress.status, filename: file.name },
            ]);
          });
          uploadCount++;
        } catch (e) {
          console.error("Error uploading file:", e);
          showError({ summary: 'Upload Failed', detail: `Error uploading ${file.name}: ${e.message}` });
        }
      }
    } catch (error) {
      showError({ summary: 'Upload Failed', detail: `Error uploading ${error}` });
      console.error("Unexpected error:", error);
    } finally {
      await fetchFiles();
      setTempFiles([]);
      setOpenSide(false);
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchFiles();
  }, [agentFilter, fetchFiles]);


  // Pagination
  const indexOfLastDocument = currentPage * documentsPerPage;
  const indexOfFirstDocument = indexOfLastDocument - documentsPerPage;
  const filteredFiles = currentAgentFiles.filter(file =>
    file.document_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const currentDocuments = filteredFiles.slice(indexOfFirstDocument, indexOfLastDocument);

  // Hero background styling
  const heroBackground =
    `linear-gradient(${theme.palette.heroBackgroundGrad.gradientFrom}, ${theme.palette.heroBackgroundGrad.gradientTo})`

  return (
    <PageBodyWrapper>
      {/* Compact Header Section */}
      <Box
        sx={{
          position: "relative",
          backgroundImage: `${heroBackground}, url('https://www.thalesgroup.com/sites/default/files/database/assets/images/2022-07/BandeauGroupeAbout2018.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          py: { xs: 3, md: 4 }, // Reduced padding
          mb: 3, // Reduced margin
          borderRadius: 2,
          boxShadow: theme.shadows[4]
        }}
      >
        <Container maxWidth="xl">
          <Fade in={showElements} timeout={1000}>
            <Grid2 container alignItems="center" spacing={2}>
              <Grid2 size={{ xs: 12, md: 8 }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Document Library
                  </Typography>
                  <Typography
                    variant="body2" // Smaller text
                    color="textSecondary"
                    sx={{ maxWidth: "700px" }}
                  >
                    Access the knowledge base documents
                  </Typography>
                </Box>
              </Grid2>

              {userInfo.canManageDocuments && (
                <Grid2 container size={{ xs: 12, md: 4 }} sx={{ justifyContent: 'flex-end', textAlign: { xs: 'left', md: 'right' } }}>
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => {
                      setUploadProgressSteps([]);
                      setTempFiles([]);
                      setOpenSide(true);
                    }}
                    size="medium" // Smaller button
                    sx={{
                      borderRadius: "8px",
                      mt: { xs: 1, md: 0 }
                    }}
                  >
                    Upload a document
                  </Button>
                </Grid2>
              )}
            </Grid2>
          </Fade>
        </Container>
      </Box>
      {/* Combined Search/Filter Section */}
      <Container maxWidth="xl" sx={{ mb: 3 }}>
        <Fade in={showElements} timeout={1500}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Grid2 container spacing={2} alignItems="center">
              <Grid2 size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  placeholder="Search a document"
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="clear search"
                          onClick={() => setSearchQuery("")}
                          edge="end"
                          size="small"
                        >
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid2>

              <Grid2 size={{ xs: 6, md: 3 }}  >
                <FormControl fullWidth size="small">
                  <InputLabel>Agent</InputLabel>
                  <Select
                    value={agentFilter || ''}
                    onChange={handleChangeAgentFilter}
                    input={<OutlinedInput label="Agent" />}
                  >
                    <MenuItem value="">All</MenuItem>
                    {agenticFlows.map((agent) => (
                      <MenuItem key={agent.nickname} value={agent.nickname}>
                        {agent.nickname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 4 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  fullWidth
                  onClick={fetchFiles}
                  size="medium"
                  sx={{ borderRadius: "8px" }}
                >
                  Search
                </Button>
              </Grid2>
            </Grid2>
          </Paper>
        </Fade>
      </Container>

      {/* Documents Container */}
      <Container maxWidth="xl">
        <Fade in={showElements} timeout={2000}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 4,
              mb: 3,
              minHeight: '500px',
              border: `1px solid ${theme.palette.divider}`,
              position: 'relative'
            }}
          >
            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <LoadingSpinner />
              </Box>
            ) : currentDocuments.length > 0 ? (
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                  Documents ({filteredFiles.length})
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mb: 3
                  }}
                >
                  {currentDocuments.map((file) => (
                    <Fade in={showElements} key={file.document_uid} timeout={1500}>
                      <Box>
                        <DocumentCard
                          fileId={file.document_uid}
                          fileName={file.document_name}
                          onDelete={userInfo.canManageDocuments ? () => handleDelete(file.document_uid) : null}
                          size="medium"
                          retrievable={file.retrievable}
                          date_added_to_kb={file.date_added_to_kb}
                          agent_name={file.agent_name}
                          isAdmin={userInfo.canManageDocuments}
                        />
                      </Box>
                    </Fade>
                  ))}
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Pagination
                    count={Math.ceil(filteredFiles.length / documentsPerPage)}
                    page={currentPage}
                    onChange={(_, value) => setCurrentPage(value)}
                    color="primary"
                    size="small" // Smaller pagination
                    shape='rounded'
                  />

                  <FormControl sx={{ minWidth: 80 }}>
                    <Select
                      value={documentsPerPage.toString()}
                      onChange={(e) => {
                        setDocumentsPerPage(parseInt(e.target.value, 10));
                        setCurrentPage(1);
                      }}
                      input={<OutlinedInput />}
                      sx={{ height: '32px' }}
                      size="small"
                    >
                      <MenuItem value="10">10</MenuItem>
                      <MenuItem value="20">20</MenuItem>
                      <MenuItem value="50">50</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="400px"
              >
                <LibraryBooksRoundedIcon
                  sx={{
                    fontSize: 60,
                    color: theme.palette.text.secondary,
                    mb: 2
                  }}
                />
                <Typography variant="h5" color="textSecondary" align="center">
                  No document found
                </Typography>
                <Typography variant="body1" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  Try to modify your search criteria
                </Typography>
                {userInfo.canManageDocuments && (
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => setOpenSide(true)}
                    sx={{ mt: 2 }}
                  >
                    Add documents
                  </Button>
                )}
              </Box>
            )}
          </Paper>
        </Fade>
      </Container>

      {/* Upload Drawer - Only visible to admins and editors */}
      {userInfo.canManageDocuments && (
        <Drawer
          anchor="right"
          open={openSide}
          onClose={() => setOpenSide(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 450 },
              p: 3,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Upload a document
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Select an agent before uploading any document
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel>Agent</InputLabel>
            <Select
              value={currentAgent}
              onChange={handleChangeAgent}
              input={<OutlinedInput label="Agent" />}
            >
              {agenticFlows.map((agent) => (
                <MenuItem
                  key={agent.nickname}
                  value={agent.nickname}
                  onClick={() => setCurrentAgenticFlow(agent)}
                >
                  {agent.nickname}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Paper
            sx={{
              mt: 3,
              p: 3,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: "12px",
              textAlign: "center",
              cursor: "pointer",
              minHeight: "180px",
              maxHeight: "400px",
              overflowY: "auto",
              backgroundColor: isHighlighted
                ? theme.palette.action.hover
                : theme.palette.background.paper,
              transition: "background-color 0.3s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
            onClick={open}
            onDragOver={(event) => {
              event.preventDefault();
              setIsHighlighted(true);
            }}
            onDragLeave={() => setIsHighlighted(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsHighlighted(false);
            }}
          >
            <input {...getInputProps()} />
            {!tempFiles.length ? (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <UploadIcon sx={{ fontSize: 40, color: "text.secondary", mb: 2 }} />
                <Typography variant="body1" color="textSecondary">
                  Drop your files here
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  or click to select (max 200Mb per file)
                </Typography>
              </Box>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                width="100%"
                alignSelf="flex-start"
              >
                {Array.from(tempFiles).map((file, index) => (
                  <DocumentCard
                    key={index}
                    fileName={file.name}
                    fileId={file.document_uid}
                    onDelete={() => handleDeleteTemp(index)}
                    size="small"
                    retrievable={false}
                    date_added_to_kb={''}
                    agent_name={''}
                    isAdmin={true}
                  />
                ))}
              </Box>
            )}
          </Paper>
          {uploadProgressSteps.length > 0 && (
            <Box sx={{ mt: 3, width: "100%" }}>
              <ProgressStepper steps={uploadProgressSteps} />
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => setOpenSide(false)}
              sx={{ borderRadius: "8px" }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={handleAddFiles}
              disabled={!currentAgenticFlow || !tempFiles.length || isLoading}
              sx={{ borderRadius: "8px" }}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Drawer>
      )}
    </PageBodyWrapper>
  );
};

