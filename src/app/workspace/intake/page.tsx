'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/store';
import { PageHeader } from '@/components/Shell';
import { JourneyRail } from '@/components/JourneyRail';
import { Questionnaire } from '@/components/Questionnaire';
import { Banner, Button } from '@/components/ui';
import { INTAKE_SECTIONS } from '@/data/methodology';

export default function IntakePage() {
  const { isBlank, engagement } = useStore();
  const router = useRouter();

  return (
    <div className="p-6">
      <PageHeader
        title="Engagement setup"
        subtitle="Layer one of three. This establishes the mandate, objectives, scope, constraints, stakeholders and hypotheses. Every answer saves as you type and stays editable for the life of the engagement."
      />
      <JourneyRail />

      <div className="mb-5">
        <Banner tone={isBlank ? 'accent' : 'info'}>
          {isBlank ? (
            <>
              <strong className="font-medium">Blank engagement.</strong> Nothing here is prepopulated. Answer what you
              can now — the next layer uploads documents and proposes answers for the rest.
            </>
          ) : (
            <>
              <strong className="font-medium">Completed demonstration.</strong> These responses were captured at kickoff.
              A few were proposed from an uploaded document and accepted — those are marked <em>From document</em>.
            </>
          )}
        </Banner>
      </div>

      <Questionnaire
        sections={INTAKE_SECTIONS}
        title="Layer 1 — initial engagement setup"
        intro={`${engagement?.label ?? 'This engagement'}. Organised into seven sections; complete them in any order.`}
        completeLabel="Continue to document upload"
        onComplete={() => router.push('/workspace/sources')}
      />
    </div>
  );
}
