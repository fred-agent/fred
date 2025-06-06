// Copyright Thales 2025
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { PageBodyWrapper } from "../common/PageBodyWrapper";
import { KeyCloakService } from "../security/KeycloakService";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import CodeIcon from "@mui/icons-material/Code";
import LogoutIcon from "@mui/icons-material/Logout";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EmailIcon from "@mui/icons-material/Email";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FingerprintIcon from "@mui/icons-material/Fingerprint";

export function Profile() {
  const username = KeyCloakService.GetUserName();
  const userRoles = KeyCloakService.GetUserRoles();
  const tokenParsed = KeyCloakService.GetTokenParsed();
  const [showToken, setShowToken] = useState(false);

  const theme = useTheme<Theme>();
  const smallSideBar = useMediaQuery(theme.breakpoints.down("md"));

  // Obtenir les initiales pour l'avatar
  const getInitials = () => {
    if (!username) return "U";
    const names = username.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Déterminer la couleur de l'avatar en fonction du rôle
  const getAvatarColor = () => {
    if (userRoles.includes("admin")) return "#D32F2F";
    if (userRoles.includes("manager")) return "#7B1FA2";
    return "#1976D2";
  };

  // Fonction pour obtenir l'icône en fonction du rôle
  const getRoleIcon = (role) => {
    if (role.includes("admin")) return <AdminPanelSettingsIcon fontSize="small" />;
    if (role.includes("user")) return <AccountCircleIcon fontSize="small" />;
    if (role.includes("manager")) return <SecurityIcon fontSize="small" />;
    return <CodeIcon fontSize="small" />;
  };

  // Fonction pour formater la date d'authentification
  const formatAuthDate = () => {
    if (!tokenParsed || !tokenParsed.auth_time) return "Not available";
    const authDate = new Date(tokenParsed.auth_time * 1000);
    return authDate.toLocaleString();
  };

  // Fonction pour formater la date d'expiration du token
  const formatExpDate = () => {
    if (!tokenParsed || !tokenParsed.exp) return "Not available";
    const expDate = new Date(tokenParsed.exp * 1000);
    return expDate.toLocaleString();
  };

  // Extraire les informations personnelles du token
  const userEmail = tokenParsed?.email || "Not available";
  const fullName = tokenParsed?.name || username || "Not available";
  const userId = tokenParsed?.sub?.substring(0, 8) || "Not available";

  return (
    <PageBodyWrapper>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          marginLeft: smallSideBar ? "20%" : "20%",
          marginRight: smallSideBar ? "20%" : "20%",
          alignItems: "center",
          py: 4,
          px: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: "bold", color: "primary.main" }}></Typography>

        {username ? (
          <Grid container spacing={4} direction="column">
            {/* Section principale du profil */}
            <Grid item xs={12}>
              <Card
                elevation={3}
                sx={{
                  borderRadius: 2,
                  overflow: "visible",
                  position: "relative",
                  pt: 7,
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -40,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      fontSize: "1.8rem",
                      fontWeight: "bold",
                      backgroundColor: getAvatarColor(),
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                </Box>

                <CardContent sx={{ pt: 3, pb: 4 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, textAlign: "center" }}>
                    {fullName}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
                    @{username}
                  </Typography>

                  <Divider sx={{ mb: 3 }} />

                  {/* Nouvelle section pour les informations utilisateur */}
                  <Grid container spacing={2} sx={{ mb: 3, alignItems: "center" }}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 2,
                          justifyContent: "center",
                        }}
                      >
                        <EmailIcon sx={{ mr: 2, color: "primary.main" }} />
                        <Typography variant="body2" fontWeight="medium">
                          Email
                        </Typography>
                        <EmailIcon sx={{ ml: 2, color: "primary.main" }} />
                      </Box>
                      <Typography variant="body1" textAlign="center">
                        {userEmail}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 2,
                          justifyContent: "center",
                        }}
                      >
                        <FingerprintIcon sx={{ mr: 2, color: "primary.main" }} />
                        <Typography variant="body2" fontWeight="medium">
                          User ID
                        </Typography>
                        <FingerprintIcon sx={{ ml: 2, color: "primary.main" }} />
                      </Box>
                      <Typography variant="body1" textAlign="center" sx={{ wordBreak: "break-all" }}>
                        {userId}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 2,
                          justifyContent: "center",
                        }}
                      >
                        <AccessTimeIcon sx={{ mr: 2, color: "primary.main" }} />
                        <Typography variant="body2" fontWeight="medium">
                          Last Authentication
                        </Typography>
                        <AccessTimeIcon sx={{ ml: 2, color: "primary.main" }} />
                      </Box>
                      <Typography variant="body1" textAlign="center">
                        {formatAuthDate()}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 2,
                          justifyContent: "center",
                        }}
                      >
                        <AccessTimeIcon sx={{ mr: 2, color: "primary.main" }} />
                        <Typography variant="body2" fontWeight="medium">
                          Expiration de la session
                        </Typography>
                        <AccessTimeIcon sx={{ ml: 2, color: "primary.main" }} />
                      </Box>
                      <Typography variant="body1" textAlign="center">
                        {formatExpDate()}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ mb: 3 }} />

                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SecurityIcon sx={{ mr: 1 }} /> User Roles
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: 1,
                      mb: 3,
                    }}
                  >
                    {userRoles.map((role) => (
                      <Tooltip key={role} title={`Role : ${role}`}>
                        <Chip
                          icon={getRoleIcon(role)}
                          label={role}
                          sx={{
                            fontWeight: "medium",
                            py: 2,
                            backgroundColor: theme.palette.mode === "dark" ? "primary.dark" : "primary.light",
                            color: theme.palette.mode === "dark" ? "white" : "primary.dark",
                            "&:hover": {
                              backgroundColor: theme.palette.primary.main,
                              color: "white",
                              transform: "translateY(-2px)",
                              transition: "all 0.2s ease",
                            },
                            transition: "all 0.2s ease",
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      onClick={() => setShowToken(!showToken)}
                      sx={{
                        borderRadius: 2,
                        px: 2,
                      }}
                    >
                      {showToken ? "hide the token" : "show the token"}
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<LogoutIcon />}
                      onClick={KeyCloakService.CallLogout}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        boxShadow: 2,
                      }}
                    >
                      Logout
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Section du token - maintenant sous la carte principale */}
            {showToken && (
              <Grid item xs={12}>
                <Card elevation={3} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        fontWeight: "medium",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <CodeIcon sx={{ mr: 1 }} /> Token Information
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: theme.palette.mode === "dark" ? "grey.800" : "grey.100",
                        borderRadius: 1,
                        p: 2,
                        maxHeight: "400px",
                        overflowY: "auto",
                        overflowX: "auto",
                        border: `1px solid ${theme.palette.divider}`,
                        "&::-webkit-scrollbar": {
                          width: "8px",
                          height: "8px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          borderRadius: "4px",
                        },
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: '"Roboto Mono", monospace',
                          fontSize: "0.75rem",
                        }}
                      >
                        {tokenParsed ? JSON.stringify(tokenParsed, null, 2) : "No available token"}
                      </pre>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          <Paper
            elevation={2}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              backgroundColor: theme.palette.mode === "dark" ? "background.paper" : "white",
            }}
          >
            <Typography variant="h5" sx={{ color: "text.secondary" }}>
              Aucun utilisateur connecté
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2, borderRadius: 2 }}
              onClick={() => (window.location.href = "/login")}
            >
              Se connecter
            </Button>
          </Paper>
        )}
      </Box>
    </PageBodyWrapper>
  );
}
