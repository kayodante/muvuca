"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ArrowUpRightIcon } from "lucide-react";
import { useDictionary } from "@/lib/i18n/client";
import { LandingMedia } from "./LandingMedia";
import styles from "./landing.module.css";

export function LandingFeatures() {
  const { landing: t } = useDictionary();
  return (
    <Tabs.Root defaultValue="library" className={styles.features}>
      <Tabs.List className={styles.tabList} aria-label={t.features.tabsLabel}>
        {t.features.items.map((item) => (
          <Tabs.Tab key={item.id} value={item.id} className={styles.tab}>
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {t.features.items.map((item) => (
        <Tabs.Panel key={item.id} value={item.id} className={styles.tabPanel}>
          <div className={styles.featureStage}>
            <LandingMedia
              number={item.number}
              label={t.media.pending}
              title={item.assetTitle}
              description={item.assetDescription}
              format={t.media.landscapeFormat}
            />
          </div>
          <div className={styles.featureCaption}>
            <p>{item.caption}</p>
            <a href="/login" aria-label={t.common.getStarted}>
              <ArrowUpRightIcon aria-hidden="true" size={20} />
            </a>
          </div>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
