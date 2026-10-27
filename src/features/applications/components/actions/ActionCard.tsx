// Which card an application shows, by status (website: CandidateActionCard.tsx). Nothing for the rest.
import type { Application } from '@/api/schemas/applications';

import { candidateAction } from '../../logic/interview';
import { DocumentsRequestCard, DocumentsSubmittedCard } from './DocumentsCards';
import { InterviewCard } from './InterviewCard';
import { JoiningCard, OfferCard } from './OfferCard';

export function ActionCard({ application }: { application: Application }) {
  switch (candidateAction(application)) {
    case 'interview':
      return <InterviewCard application={application} />;
    case 'documents':
      return <DocumentsRequestCard application={application} />;
    case 'documentsSubmitted':
      return <DocumentsSubmittedCard application={application} />;
    case 'offer':
      return <OfferCard application={application} />;
    case 'joining':
      return <JoiningCard application={application} />;
    default:
      return null;
  }
}
