package com.memoriser.user.infrastructure;

import com.memoriser.user.domain.User;
import com.memoriser.user.domain.UserRepository;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;

@Singleton
public class UserRepositoryAdapter implements UserRepository {
    
    private final MicronautDataMongoUserRepository mongoRepository;
    
    public UserRepositoryAdapter(MicronautDataMongoUserRepository mongoRepository) {
        this.mongoRepository = mongoRepository;
    }
    
    @Override
    public Publisher<User> findByEmail(String email) {
        return mongoRepository.findByEmail(email).map(this::toDomain);
    }
    
    @Override
    public Publisher<User> findByGoogleSubjectId(String subjectId) {
        return mongoRepository.findByGoogleSubjectId(subjectId).map(this::toDomain);
    }
    
    @Override
    public Publisher<User> save(User user) {
        return mongoRepository.save(toMongo(user)).map(this::toDomain);
    }
    
    private User toDomain(MongoUser mongo) {
        User user = new User();
        user.setId(mongo.getId());
        user.setEmail(mongo.getEmail());
        user.setGoogleSubjectId(mongo.getGoogleSubjectId());
        user.setCreatedAt(mongo.getCreatedAt());
        return user;
    }
    
    private MongoUser toMongo(User user) {
        MongoUser mongo = new MongoUser();
        mongo.setId(user.getId());
        mongo.setEmail(user.getEmail());
        mongo.setGoogleSubjectId(user.getGoogleSubjectId());
        mongo.setCreatedAt(user.getCreatedAt());
        return mongo;
    }
}
