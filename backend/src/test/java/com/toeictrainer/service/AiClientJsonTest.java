package com.toeictrainer.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AiClientJsonTest {

    @Test
    void extractJson_stripsMarkdownFences() {
        String raw = "```json\n{\"a\": 1}\n```";
        assertEquals("{\"a\": 1}", AiClient.extractJson(raw));
    }

    @Test
    void extractJson_stripsLeadingProse() {
        String raw = "Here is the result:\n{\"relations\": []}";
        assertEquals("{\"relations\": []}", AiClient.extractJson(raw));
    }

    @Test
    void extractJson_plainJsonUnchanged() {
        String raw = "{\"word\": \"apple\"}";
        assertEquals(raw, AiClient.extractJson(raw));
    }

    @Test
    void extractJson_nullReturnsEmptyObject() {
        assertEquals("{}", AiClient.extractJson(null));
    }
}
