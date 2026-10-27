'use client';

import Link from 'next/link';
import { Button, Column, Grid, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { Conversation, Report, Microphone } from '@carbon/pictograms-react';
import styles from './Landing.module.scss';

const VALUE_PROPS = [
  {
    pictogram: Conversation,
    title: 'Describe your goal',
    body: 'A guided chat turns “should we invest?” or “can we open in Riyadh?” into a clear research brief.',
  },
  {
    pictogram: Report,
    title: 'Buy what already exists',
    body: 'See exactly which of your questions our expert-backed library already answers, and buy those reports with credits.',
  },
  {
    pictogram: Microphone,
    title: 'Commission the rest',
    body: 'Get a quote for custom research. Vetted experts give interviews; you get a report built from what they said.',
  },
];

export function Landing() {
  return (
    <div className={styles.root}>
      <Grid className={styles.hero}>
        <Column sm={4} md={8} lg={10}>
          <p className={styles.eyebrow}>Expert-backed research library</p>
          <h1 className={styles.title}>Decide with answers from people who have done it.</h1>
          <p className={styles.lead}>
            Xpert Network helps investors and growing businesses get answers from industry experts:
            from our library in minutes, or as custom research in days.
          </p>
          <div className={styles.actions}>
            <Button as={Link} href="/sign-up" renderIcon={ArrowRight}>
              Get started
            </Button>
            <Button as={Link} href="/login" kind="tertiary">
              Log in
            </Button>
          </div>
        </Column>
      </Grid>
      <Grid className={styles.values}>
        {VALUE_PROPS.map(({ pictogram: Pictogram, title, body }) => (
          <Column key={title} sm={4} md={8} lg={5}>
            <Tile className={styles.tile}>
              <Pictogram aria-hidden="true" className={styles.pictogram} />
              <h2 className={styles.tileTitle}>{title}</h2>
              <p className={styles.tileBody}>{body}</p>
            </Tile>
          </Column>
        ))}
      </Grid>
      <Grid className={styles.experts}>
        <Column sm={4} md={8} lg={10}>
          <h2 className={styles.sectionTitle}>Are you an industry expert?</h2>
          <p className={styles.tileBody}>
            Answer open calls on topics you know and get paid for each accepted interview. Speak or
            type with our AI interviewer, at a time that suits you.
          </p>
          <Button as={Link} href="/sign-up?role=expert" kind="ghost" renderIcon={ArrowRight}>
            Join as an expert
          </Button>
        </Column>
      </Grid>
    </div>
  );
}
