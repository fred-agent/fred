import { Box, Typography, CircularProgress, Paper } from "@mui/material";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';
import MarkdownRenderer from "../common/MarkdownRenderer";

interface MarkdownViewerProps {
  markdown: string;
  isLoading?: boolean;
}

/**
 * Simple Markdown viewer component
 */
const MarkdownViewer = ({ markdown, isLoading = false }: MarkdownViewerProps) => {
  // Custom components for ReactMarkdown with proper TypeScript handling
  const components = {
    // Handle headings with proper type handling
    h1: ({ children }: { children: React.ReactNode }) => (
      <Typography variant="h4" gutterBottom>{children}</Typography>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <Typography variant="h5" gutterBottom>{children}</Typography>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <Typography variant="h6" gutterBottom>{children}</Typography>
    ),
    h4: ({ children }: { children: React.ReactNode }) => (
      <Typography variant="subtitle1" gutterBottom>{children}</Typography>
    ),
    // Handle paragraphs
    p: ({ children }: { children: React.ReactNode }) => (
      <Typography variant="body1" sx={{ mb: 2 }}>{children}</Typography>
    ),
    // Handle links
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a href={href} style={{ color: '#1976d2', textDecoration: 'none' }}>{children}</a>
    ),
    // Handle code blocks and inline code
    code: ({ inline, children, className }: { 
      inline?: boolean; 
      children: React.ReactNode;
      className?: string;
    }) => {
      return inline ? (
        <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '4px' }}>
          {children}
        </code>
      ) : (
        <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, overflowX: 'auto' }}>
          <code className={className}>{children}</code>
        </Box>
      );
    },
    // Handle lists
    ul: ({ children }: { children: React.ReactNode }) => (
      <Box component="ul" sx={{ pl: 2, mb: 2 }}>{children}</Box>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <Box component="ol" sx={{ pl: 2, mb: 2 }}>{children}</Box>
    ),
    // Handle list items
    li: ({ children }: { children: React.ReactNode }) => (
      <Box component="li" sx={{ mb: 0.5 }}>{children}</Box>
    ),
    // Handle blockquotes
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <Box component="blockquote" sx={{ borderLeft: '4px solid #e0e0e0', pl: 2, py: 0.5, my: 2, color: 'text.secondary' }}>
        {children}
      </Box>
    ),
    // Handle horizontal rules
    hr: () => <Box component="hr" sx={{ my: 2, borderColor: 'divider' }} />,
    // Handle tables
    table: ({ children }: { children: React.ReactNode }) => (
      <Box sx={{ overflowX: 'auto', mb: 2 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
      </Box>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th style={{ border: '1px solid #e0e0e0', padding: '8px 16px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>
        {children}
      </th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td style={{ border: '1px solid #e0e0e0', padding: '8px 16px' }}>
        {children}
      </td>
    ),
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
         <MarkdownRenderer content={markdown}   size = 'medium' />
        )}
      </Box>
    </Box>
  );
};

export default MarkdownViewer;