package com.memoriser.vocabulary.domain;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;
import java.time.Instant;

@Serdeable
public class VocabularyItem {
    private String id;
    private String word;
    
    // Rich Dictionary Data
    private List<Meaning> meanings;
    private String pronunciation;
    private String audioUrl;
    private String origin;
    private String notes;
    
    // Fallback/Legacy flat fields (kept for backward compatibility and simple adds)
    private List<String> definitions;
    private List<String> examples;
    private List<String> synonyms;
    private List<String> antonyms;
    
    private String difficulty;
    private List<String> topics;
    private List<String> relatedWords;
    private String createdBy;
    private Instant createdAt;
    private Instant updatedAt;

    public VocabularyItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getWord() { return word; }
    public void setWord(String word) { this.word = word; }
    
    public List<Meaning> getMeanings() { return meanings; }
    public void setMeanings(List<Meaning> meanings) { this.meanings = meanings; }
    
    public String getPronunciation() { return pronunciation; }
    public void setPronunciation(String pronunciation) { this.pronunciation = pronunciation; }
    
    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
    
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public List<String> getDefinitions() { return definitions; }
    public void setDefinitions(List<String> definitions) { this.definitions = definitions; }
    
    public List<String> getExamples() { return examples; }
    public void setExamples(List<String> examples) { this.examples = examples; }
    
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    
    public List<String> getTopics() { return topics; }
    public void setTopics(List<String> topics) { this.topics = topics; }
    
    public List<String> getSynonyms() { return synonyms; }
    public void setSynonyms(List<String> synonyms) { this.synonyms = synonyms; }
    
    public List<String> getAntonyms() { return antonyms; }
    public void setAntonyms(List<String> antonyms) { this.antonyms = antonyms; }
    
    public List<String> getRelatedWords() { return relatedWords; }
    public void setRelatedWords(List<String> relatedWords) { this.relatedWords = relatedWords; }
    
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
