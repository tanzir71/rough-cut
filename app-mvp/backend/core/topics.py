from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


@dataclass(frozen=True)
class TopicResult:
    labels: list[str]
    segment_topics: list[list[str]]


def tag_topics(texts: list[str], max_topics: int = 5) -> TopicResult:
    if not texts:
        return TopicResult(labels=[], segment_topics=[])
    if len(texts) == 1:
        return TopicResult(labels=["general"], segment_topics=[["general"]])

    vectorizer = TfidfVectorizer(stop_words="english", max_features=8000)
    X = vectorizer.fit_transform(texts)
    k = min(max_topics, max(2, int(round(len(texts) ** 0.5))))
    km = KMeans(n_clusters=k, random_state=42, n_init="auto")
    cluster_ids = km.fit_predict(X)

    terms = np.array(vectorizer.get_feature_names_out())
    labels: list[str] = []
    cluster_labels: dict[int, str] = {}
    for c in range(k):
        idx = np.where(cluster_ids == c)[0]
        if idx.size == 0:
            cluster_labels[c] = "general"
            continue
        center = km.cluster_centers_[c]
        top = center.argsort()[-3:][::-1]
        label = " ".join(terms[top].tolist()) or "general"
        cluster_labels[c] = label
        labels.append(label)

    segment_topics = [[cluster_labels[int(cid)]] for cid in cluster_ids.tolist()]
    return TopicResult(labels=labels, segment_topics=segment_topics)

