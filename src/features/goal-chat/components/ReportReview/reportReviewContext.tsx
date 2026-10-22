'use client';

import { createContext, useContext, type ReactNode } from 'react';

const ReportReviewContext = createContext<((reportId: string) => void) | null>(null);

/** Lets a chat widget open the report beside the thread instead of leaving the page. */
export function ReportReviewProvider({
  onOpen,
  children,
}: {
  onOpen: (reportId: string) => void;
  children: ReactNode;
}) {
  return <ReportReviewContext.Provider value={onOpen}>{children}</ReportReviewContext.Provider>;
}

export function useOpenReportReview(): ((reportId: string) => void) | null {
  return useContext(ReportReviewContext);
}
