import { createApi } from '@reduxjs/toolkit/query/react';
import { Metadata } from '../components/DocumentCard.tsx';
import { createDynamicBaseQuery } from '../common/dynamicBaseQuery.tsx';

export const documentApiSlice = createApi({
  reducerPath: 'documentApi',
  baseQuery: createDynamicBaseQuery({ backend: "knowledge" }),
  endpoints: () => ({}),
});
export const { reducer: documentApiReducer, middleware: documenApiMiddleware } = documentApiSlice;
const extendedDocumentApi = documentApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFullDocument: builder.mutation<Metadata, { document_uid: string }>({
      query: ({ document_uid }) => ({
          url: `/knowledge/v1/fullDocument/${document_uid}`,
          method: 'GET',
      }),
    }),
    getDocumentMetadata: builder.mutation<Metadata, { document_uid: string }>({
      query: ({ document_uid }) => ({
        url: `/knowledge/v1/document/${document_uid}`,
        method: 'GET',
      }),
    }),
    getDocumentsWithFilter: builder.mutation<{ documents: DocumentType[] }, Record<string, any>>({
      query: (filters) => ({
        url: `/knowledge/v1/documents/metadata`, // Single endpoint
        method: 'POST',
        body: filters ?? {}, // If filters are undefined, send empty object
      }),
    }),
    putDocumentMetadata: builder.mutation<Metadata, { document_uid: string; metadata: Metadata }>({
      query: ({ document_uid, metadata }) => ({
        url: `/knowledge/v1/document/${document_uid}`,
        method: 'PUT',
        body: metadata,
      }),
    }),
    deleteDocument: builder.mutation<void, string>({
            query: (documentUid) => ({
              url: `/knowledge/v1/document/${documentUid}`,
              method: "DELETE",
            }),
          }),
  }),
});

export const {
  useGetDocumentMetadataMutation,
  usePutDocumentMetadataMutation,
  useGetDocumentsWithFilterMutation,
  useGetFullDocumentMutation,
  useDeleteDocumentMutation,
} = extendedDocumentApi;
