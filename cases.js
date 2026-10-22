export const caseStudies = {
  mcgraw: {
    title: 'From one objective to a complete lesson kit.',
    date: 'May to August 2026',
    role: 'AI/ML Engineer, Contract · McGraw Hill · Eller Immersion Learning',
    summary: 'Built a textbook-grounded RAG engine that turns a learning objective into a citable outline, teaching script, slides, and assessments.',
    sections: [
      { heading: 'The workflow', body: 'Instructors needed a faster path from a learning objective to lesson material they could trace back to the textbook. The engine connected retrieval, generation, and evaluation in one delivery flow.' },
      { heading: 'What I built', bullets: ['Retrieval grounding with PostgreSQL, pgvector, and Voyage embeddings.', 'A Python and FastAPI generation pipeline using the Claude API.', 'Progressive QA gates, LLM-as-judge evaluation, and bounded auto-refinement to keep the lesson within scope.', 'A React and TypeScript delivery interface for the generated teaching material.'] },
    ],
    outcome: 'Reduced lecture preparation from hours to minutes. Delivered a production-ready proof of concept to the client.',
    stack: 'Python · FastAPI · PostgreSQL · pgvector · Claude API · Voyage embeddings · React · TypeScript'
  },
  brainbridge: {
    title: 'Turning anonymous traffic into attributed leads.',
    date: 'May to August 2026',
    role: 'Forward Deployed AI Engineer Intern · Brain Bridge Labs',
    summary: 'Shipped a serverless Python pipeline that connects website activity to CRM records, then brought chatbot conversations into the same lead flow.',
    sections: [
      { heading: 'The workflow', body: 'A website with 600 monthly visitors had no prior lead capture. The project covered the forward deployed loop, from selecting the work based on potential value to shipping and checking the resulting lead flow.' },
      { heading: 'What I built', bullets: ['A serverless Python pipeline on AWS Lambda and API Gateway, provisioned with AWS CDK.', 'Consistent CRM routing for both form submissions and conversational leads from an embedded AI chatbot.', 'A fix for a silent attribution failure that had filed every lead under a fallback source.', 'Verification with 27 pytest unit tests and 10 Playwright end-to-end tests.'] },
    ],
    outcome: 'Restored attribution across 35+ campaigns. The lead-capture pipeline was modeled to add roughly $2K per year in new sales pipeline; that figure is modeled potential, not realized revenue.',
    stack: 'Python · AWS Lambda · API Gateway · AWS CDK · pytest · Playwright'
  },
  healthcare: {
    title: 'Making complex patient data easier to work with.',
    date: 'February to May 2026 / April 2026',
    role: 'Two separate projects: MyPeps and Bridge-to-Care',
    summary: 'Healthcare work focused my attention on context, structured data, and the reliability of the workflow around the model.',
    sections: [
      { heading: 'MyPeps · AI Engineer · February to May 2026', body: 'Built a Python integration layer using the Claude API and PyMuPDF to extract structured data from PDF and image-based lab reports. The ingestion pipeline generated patient wellness insights and provider follow-up notes using RAG-style prompt construction.', bullets: ['Reference-range validation and diagnostic guardrails.', 'Audit logging and session validation middleware.', 'Reusable backend components for more reliable clinical-data handling.'] },
      { heading: 'Bridge-to-Care · Project · April 2026', body: 'Built a modular backend and developer-facing platform for processing daily patient check-ins, using four-tier risk scoring, custom safety logic, and generated clinician PDF reports.', bullets: ['React and TypeScript interface, with the Google Gemini API.', 'A production-ready backend structured around check-in data and clinician review.'] },
    ],
    outcome: 'Two distinct applications of AI to healthcare workflows: structured lab-report ingestion and daily check-in triage.',
    stack: 'MyPeps: Python · Claude API · PyMuPDF. Bridge-to-Care: React · TypeScript · Gemini API · Tailwind'
  },
  vantage: {
    title: 'Peer support designed around trust.',
    date: 'May to August 2026',
    role: 'Full-Stack Developer, Contract · Vantage West · Eller Immersion Learning',
    summary: 'Built CUCAN, a confidential mutual-aid platform where credit unions can request and offer peer support anonymously.',
    sections: [
      { heading: 'The workflow', body: 'Institutions needed to ask for help while retaining control of their identity. The platform keeps requests anonymous and reveals identities only after both parties consent.' },
      { heading: 'What I built', bullets: ['Two-party consent for identity disclosure, with PII detection.', 'Per-user non-solicitation pledge gating and a plain-language audit log.', 'Member verification against the NCUA roster of 4,200+ federally insured credit unions, with geography-scoped request visibility.', 'A FastAPI, SQLModel, PostgreSQL, Jinja2, and Tailwind application deployed on Render.'] },
    ],
    outcome: 'Verified the platform with 175+ automated tests. The 4,200+ figure describes the verification roster, not the number of users.',
    stack: 'FastAPI · SQLModel · PostgreSQL · Jinja2 · Tailwind · Render'
  }
};
