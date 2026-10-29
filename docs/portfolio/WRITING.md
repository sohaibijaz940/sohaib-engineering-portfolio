# Writing — authoring and maintenance

The canonical content lives in src/content/writing/*.mdx. Six complete articles replace the old short Notes entries. The two old Notes URLs and /notes/ permanently redirect to the matching Writing URLs.

## Edit content

- Article descriptions, workflow steps, demo links and learning outcomes: src/data/writing.ts.
- Long-form prose: src/content/writing/*.mdx. Use plain second-level headings; the preparation script derives stable heading anchors and estimated reading time.
- Reusable blocks: src/components/writing/. Callout, Workflow, SourceCode, AnnotatedShot and TeachingLab are available in MDX.
- Source excerpts: src/data/writing-snippets.json. These are snapshots of the named implementation files. Review and refresh them when the implementation changes.
- Run npm run writing:prepare after editing prose. npm run build runs it automatically. Run npm run test:writing, npm run typecheck and npm run build before release.
- Interactive labs use pure teaching data; Travel, Word Search and AVL reuse their application engines. The TrustMart client teaching calculation mirrors the Python engine, including tie-to-even rounding. It does not query real supplier records. CareIndex's booking diagram is a simulation, not a database concurrency test.

## Video assets

public/writing/media contains four 65–72 second H.264/AAC MP4s, English WebVTT captions, posters, plain-text transcripts and chapter metadata. src/data/writing-stories.json supplies the player UI. Videos load metadata only, play on request, and include native audio/caption controls, speed selection and chapter seek buttons. No soundtrack or third-party footage is used. Narration is the installed Microsoft Zira Desktop synthetic English voice. Captions are aligned to the speech engine's word-progress audio positions.

The video compositions combine actual application screenshots with explicitly labelled explanatory diagrams and illustrative figures. They are not presented as recordings of live provider requests. Video generation sources are included under scripts/writing-production; regeneration on Windows requires the installed voice, Python with Pillow, and FFmpeg. Configure the project root and FFmpeg location in those production helpers before use on another computer. Normal npm setup does not regenerate media.

## Publication

outputs/writing/Medium-Ready-Articles.zip contains six static Markdown editions and media. It has not been published externally. The portfolio must have a public URL before a useful cross-publication canonical link can be set. A domain alone does not supply hosting. Existing service keys, billing requirements and provider limitations remain unchanged.

## Accessibility

Reduced-motion preferences disable decorative motion; there is no autoplay sound. Figures have text alternatives and enlargement dialogs. Interactive examples use labelled native controls. The contents navigation links to real heading anchors. English captions and a readable/downloadable transcript accompany every narrated video.
