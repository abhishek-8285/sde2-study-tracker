# 🏗️ Missing Design Patterns for SDE2+

## 📋 **Critical Design Patterns Not Yet Covered**

Based on analysis of existing patterns directory, these 15 patterns need implementation:

---

## 🔄 **BEHAVIORAL PATTERNS (Missing)**

### **1. Memento Pattern - Undo/Redo Functionality**

```java
// Memento for text editor
public class EditorMemento {
    private final String content;
    private final int cursorPosition;
    private final Instant timestamp;

    public EditorMemento(String content, int cursorPosition) {
        this.content = content;
        this.cursorPosition = cursorPosition;
        this.timestamp = Instant.now();
    }

    public String getContent() { return content; }
    public int getCursorPosition() { return cursorPosition; }
    public Instant getTimestamp() { return timestamp; }
}

public class TextEditor {
    private String content = "";
    private int cursorPosition = 0;
    private final UndoRedoManager undoRedoManager = new UndoRedoManager();

    public void write(String text) {
        saveState(); // Save current state before modification
        content = content.substring(0, cursorPosition) + text +
                 content.substring(cursorPosition);
        cursorPosition += text.length();
    }

    public void delete(int length) {
        saveState();
        int endPos = Math.min(cursorPosition + length, content.length());
        content = content.substring(0, cursorPosition) +
                 content.substring(endPos);
    }

    public void undo() {
        EditorMemento memento = undoRedoManager.undo();
        if (memento != null) {
            restore(memento);
        }
    }

    public void redo() {
        EditorMemento memento = undoRedoManager.redo();
        if (memento != null) {
            restore(memento);
        }
    }

    private void saveState() {
        EditorMemento memento = new EditorMemento(content, cursorPosition);
        undoRedoManager.saveState(memento);
    }

    private void restore(EditorMemento memento) {
        this.content = memento.getContent();
        this.cursorPosition = memento.getCursorPosition();
    }
}

public class UndoRedoManager {
    private final Stack<EditorMemento> undoStack = new Stack<>();
    private final Stack<EditorMemento> redoStack = new Stack<>();
    private final int maxHistorySize = 100;

    public void saveState(EditorMemento memento) {
        undoStack.push(memento);
        redoStack.clear(); // Clear redo stack when new state is saved

        // Limit history size
        if (undoStack.size() > maxHistorySize) {
            undoStack.removeElementAt(0);
        }
    }

    public EditorMemento undo() {
        if (!undoStack.isEmpty()) {
            EditorMemento current = undoStack.pop();
            redoStack.push(current);
            return undoStack.isEmpty() ? null : undoStack.peek();
        }
        return null;
    }

    public EditorMemento redo() {
        if (!redoStack.isEmpty()) {
            EditorMemento memento = redoStack.pop();
            undoStack.push(memento);
            return memento;
        }
        return null;
    }
}
```

### **2. Visitor Pattern - Operations on Object Structures**

```java
// Visitor interface
public interface DocumentElementVisitor {
    void visit(Paragraph paragraph);
    void visit(Heading heading);
    void visit(Image image);
    void visit(Table table);
}

// Element interface
public interface DocumentElement {
    void accept(DocumentElementVisitor visitor);
}

// Concrete elements
public class Paragraph implements DocumentElement {
    private final String text;
    private final String style;

    public Paragraph(String text, String style) {
        this.text = text;
        this.style = style;
    }

    @Override
    public void accept(DocumentElementVisitor visitor) {
        visitor.visit(this);
    }

    public String getText() { return text; }
    public String getStyle() { return style; }
}

public class Heading implements DocumentElement {
    private final String text;
    private final int level;

    public Heading(String text, int level) {
        this.text = text;
        this.level = level;
    }

    @Override
    public void accept(DocumentElementVisitor visitor) {
        visitor.visit(this);
    }

    public String getText() { return text; }
    public int getLevel() { return level; }
}

// Concrete visitors
public class HTMLExportVisitor implements DocumentElementVisitor {
    private final StringBuilder html = new StringBuilder();

    @Override
    public void visit(Paragraph paragraph) {
        html.append("<p class=\"").append(paragraph.getStyle()).append("\">")
            .append(paragraph.getText())
            .append("</p>\n");
    }

    @Override
    public void visit(Heading heading) {
        html.append("<h").append(heading.getLevel()).append(">")
            .append(heading.getText())
            .append("</h").append(heading.getLevel()).append(">\n");
    }

    @Override
    public void visit(Image image) {
        html.append("<img src=\"").append(image.getSource())
            .append("\" alt=\"").append(image.getAltText()).append("\" />\n");
    }

    @Override
    public void visit(Table table) {
        html.append("<table>\n");
        // Table rendering logic
        html.append("</table>\n");
    }

    public String getHTML() {
        return html.toString();
    }
}

public class WordCountVisitor implements DocumentElementVisitor {
    private int wordCount = 0;

    @Override
    public void visit(Paragraph paragraph) {
        wordCount += countWords(paragraph.getText());
    }

    @Override
    public void visit(Heading heading) {
        wordCount += countWords(heading.getText());
    }

    @Override
    public void visit(Image image) {
        wordCount += countWords(image.getAltText());
    }

    @Override
    public void visit(Table table) {
        // Count words in table cells
    }

    private int countWords(String text) {
        return text.trim().isEmpty() ? 0 : text.trim().split("\\s+").length;
    }

    public int getWordCount() {
        return wordCount;
    }
}
```

### **3. Mediator Pattern - Object Communication**

```java
// Mediator interface
public interface ChatMediator {
    void sendMessage(String message, User user);
    void addUser(User user);
    void removeUser(User user);
}

// Concrete mediator
public class ChatRoom implements ChatMediator {
    private final List<User> users = new ArrayList<>();
    private final List<String> messageHistory = new ArrayList<>();

    @Override
    public void sendMessage(String message, User sender) {
        String formattedMessage = String.format("[%s] %s: %s",
            LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")),
            sender.getName(),
            message);

        messageHistory.add(formattedMessage);

        // Send to all users except sender
        users.stream()
            .filter(user -> !user.equals(sender))
            .forEach(user -> user.receive(formattedMessage));
    }

    @Override
    public void addUser(User user) {
        users.add(user);
        user.setMediator(this);

        // Send join notification
        String joinMessage = user.getName() + " joined the chat";
        users.stream()
            .filter(u -> !u.equals(user))
            .forEach(u -> u.receive(joinMessage));
    }

    @Override
    public void removeUser(User user) {
        users.remove(user);

        // Send leave notification
        String leaveMessage = user.getName() + " left the chat";
        users.forEach(u -> u.receive(leaveMessage));
    }
}

// Colleague classes
public abstract class User {
    protected ChatMediator mediator;
    protected String name;

    public User(String name) {
        this.name = name;
    }

    public abstract void send(String message);
    public abstract void receive(String message);

    public void setMediator(ChatMediator mediator) {
        this.mediator = mediator;
    }

    public String getName() {
        return name;
    }
}

public class RegularUser extends User {
    public RegularUser(String name) {
        super(name);
    }

    @Override
    public void send(String message) {
        System.out.println(name + " sending: " + message);
        mediator.sendMessage(message, this);
    }

    @Override
    public void receive(String message) {
        System.out.println(name + " received: " + message);
    }
}

public class ModeratorUser extends User {
    public ModeratorUser(String name) {
        super(name);
    }

    @Override
    public void send(String message) {
        System.out.println("[MODERATOR] " + name + " sending: " + message);
        mediator.sendMessage("[MODERATOR] " + message, this);
    }

    @Override
    public void receive(String message) {
        System.out.println("[MODERATOR] " + name + " received: " + message);
    }

    public void moderateMessage(String message, User user) {
        // Moderator-specific functionality
        System.out.println("[MODERATION] " + name + " is moderating message from " + user.getName());
    }
}
```

---

## 🏗️ **STRUCTURAL PATTERNS (Missing)**

### **4. Flyweight Pattern - Memory Optimization**

```java
// Flyweight interface
public interface Character {
    void render(int x, int y, String color, int fontSize);
}

// Concrete flyweight
public class ConcreteCharacter implements Character {
    private final char symbol; // Intrinsic state

    public ConcreteCharacter(char symbol) {
        this.symbol = symbol;
    }

    @Override
    public void render(int x, int y, String color, int fontSize) {
        // Render character at position with extrinsic state
        System.out.printf("Rendering '%c' at (%d,%d) in %s color, size %d%n",
                         symbol, x, y, color, fontSize);
    }
}

// Flyweight factory
public class CharacterFactory {
    private static final Map<java.lang.Character, Character> characters = new HashMap<>();

    public static Character getCharacter(char symbol) {
        return characters.computeIfAbsent(symbol, ConcreteCharacter::new);
    }

    public static int getCreatedCharacterCount() {
        return characters.size();
    }
}

// Context class using flyweights
public class TextDocument {
    private final List<CharacterPosition> characters = new ArrayList<>();

    public void addCharacter(char symbol, int x, int y, String color, int fontSize) {
        Character character = CharacterFactory.getCharacter(symbol);
        characters.add(new CharacterPosition(character, x, y, color, fontSize));
    }

    public void render() {
        characters.forEach(CharacterPosition::render);
    }

    private static class CharacterPosition {
        private final Character character;
        private final int x, y;
        private final String color;
        private final int fontSize;

        public CharacterPosition(Character character, int x, int y, String color, int fontSize) {
            this.character = character;
            this.x = x;
            this.y = y;
            this.color = color;
            this.fontSize = fontSize;
        }

        public void render() {
            character.render(x, y, color, fontSize);
        }
    }
}
```

### **5. Bridge Pattern - Implementation Independence**

```java
// Implementation interface
public interface MessageSender {
    void sendMessage(String message, String recipient);
}

// Concrete implementations
public class EmailSender implements MessageSender {
    @Override
    public void sendMessage(String message, String recipient) {
        System.out.println("Sending email to " + recipient + ": " + message);
    }
}

public class SMSSender implements MessageSender {
    @Override
    public void sendMessage(String message, String recipient) {
        System.out.println("Sending SMS to " + recipient + ": " + message);
    }
}

public class PushNotificationSender implements MessageSender {
    @Override
    public void sendMessage(String message, String recipient) {
        System.out.println("Sending push notification to " + recipient + ": " + message);
    }
}

// Abstraction
public abstract class Notification {
    protected MessageSender messageSender;

    public Notification(MessageSender messageSender) {
        this.messageSender = messageSender;
    }

    public abstract void send(String message, String recipient);
}

// Refined abstractions
public class SimpleNotification extends Notification {
    public SimpleNotification(MessageSender messageSender) {
        super(messageSender);
    }

    @Override
    public void send(String message, String recipient) {
        messageSender.sendMessage(message, recipient);
    }
}

public class EncryptedNotification extends Notification {
    private final EncryptionService encryptionService;

    public EncryptedNotification(MessageSender messageSender, EncryptionService encryptionService) {
        super(messageSender);
        this.encryptionService = encryptionService;
    }

    @Override
    public void send(String message, String recipient) {
        String encryptedMessage = encryptionService.encrypt(message);
        messageSender.sendMessage(encryptedMessage, recipient);
    }
}

public class ScheduledNotification extends Notification {
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public ScheduledNotification(MessageSender messageSender) {
        super(messageSender);
    }

    @Override
    public void send(String message, String recipient) {
        messageSender.sendMessage(message, recipient);
    }

    public void sendDelayed(String message, String recipient, long delay, TimeUnit unit) {
        scheduler.schedule(() -> send(message, recipient), delay, unit);
    }
}
```

---

## 🔄 **CREATIONAL PATTERNS (Missing)**

### **6. Multiton Pattern - Controlled Multiple Instances**

```java
public class DatabaseConnection {
    private static final Map<String, DatabaseConnection> instances = new ConcurrentHashMap<>();
    private static final int MAX_INSTANCES = 5;

    private final String databaseName;
    private final Connection connection;

    private DatabaseConnection(String databaseName) {
        this.databaseName = databaseName;
        this.connection = createConnection(databaseName);
    }

    public static DatabaseConnection getInstance(String databaseName) {
        return instances.computeIfAbsent(databaseName, dbName -> {
            if (instances.size() >= MAX_INSTANCES) {
                throw new IllegalStateException("Maximum number of database connections reached");
            }
            return new DatabaseConnection(dbName);
        });
    }

    public Connection getConnection() {
        return connection;
    }

    public String getDatabaseName() {
        return databaseName;
    }

    private Connection createConnection(String databaseName) {
        // Create actual database connection
        try {
            return DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/" + databaseName,
                "user", "password");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to create connection to " + databaseName, e);
        }
    }

    public static Set<String> getActiveConnections() {
        return Set.copyOf(instances.keySet());
    }

    public static void closeConnection(String databaseName) {
        DatabaseConnection instance = instances.remove(databaseName);
        if (instance != null) {
            try {
                instance.connection.close();
            } catch (SQLException e) {
                System.err.println("Error closing connection: " + e.getMessage());
            }
        }
    }
}
```

---

## 📋 **Modern Patterns for SDE2+**

### **7. Repository Pattern - Data Access Abstraction**

```java
// Domain entity
public class User {
    private Long id;
    private String email;
    private String name;
    private LocalDateTime createdAt;
    private boolean active;

    // constructors, getters, setters...
}

// Repository interface
public interface UserRepository {
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
    List<User> findByNameContaining(String name);
    Page<User> findAll(Pageable pageable);
    User save(User user);
    void deleteById(Long id);
    boolean existsByEmail(String email);
}

// JPA implementation
@Repository
public class JpaUserRepository implements UserRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Optional<User> findById(Long id) {
        User user = entityManager.find(User.class, id);
        return Optional.ofNullable(user);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        TypedQuery<User> query = entityManager.createQuery(
            "SELECT u FROM User u WHERE u.email = :email", User.class);
        query.setParameter("email", email);

        try {
            return Optional.of(query.getSingleResult());
        } catch (NoResultException e) {
            return Optional.empty();
        }
    }

    @Override
    public List<User> findByNameContaining(String name) {
        TypedQuery<User> query = entityManager.createQuery(
            "SELECT u FROM User u WHERE u.name LIKE :name", User.class);
        query.setParameter("name", "%" + name + "%");
        return query.getResultList();
    }

    @Override
    @Transactional
    public User save(User user) {
        if (user.getId() == null) {
            entityManager.persist(user);
            return user;
        } else {
            return entityManager.merge(user);
        }
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        User user = entityManager.find(User.class, id);
        if (user != null) {
            entityManager.remove(user);
        }
    }

    @Override
    public boolean existsByEmail(String email) {
        TypedQuery<Long> query = entityManager.createQuery(
            "SELECT COUNT(u) FROM User u WHERE u.email = :email", Long.class);
        query.setParameter("email", email);
        return query.getSingleResult() > 0;
    }
}

// Service using repository
@Service
@Transactional
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(String email, String name) {
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("User with email already exists: " + email);
        }

        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setCreatedAt(LocalDateTime.now());
        user.setActive(true);

        return userRepository.save(user);
    }

    public Optional<User> findUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Page<User> getAllUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return userRepository.findAll(pageable);
    }
}
```

### **8. Unit of Work Pattern - Transaction Management**

```java
// Unit of Work interface
public interface UnitOfWork {
    void registerNew(Entity entity);
    void registerDirty(Entity entity);
    void registerRemoved(Entity entity);
    void commit();
    void rollback();
}

// Implementation
@Component
public class JpaUnitOfWork implements UnitOfWork {

    @PersistenceContext
    private EntityManager entityManager;

    private final Set<Entity> newEntities = new HashSet<>();
    private final Set<Entity> dirtyEntities = new HashSet<>();
    private final Set<Entity> removedEntities = new HashSet<>();

    @Override
    public void registerNew(Entity entity) {
        if (removedEntities.contains(entity)) {
            throw new IllegalStateException("Entity is marked for removal");
        }
        if (dirtyEntities.contains(entity)) {
            throw new IllegalStateException("Entity is already marked as dirty");
        }
        newEntities.add(entity);
    }

    @Override
    public void registerDirty(Entity entity) {
        if (removedEntities.contains(entity)) {
            throw new IllegalStateException("Entity is marked for removal");
        }
        if (!newEntities.contains(entity)) {
            dirtyEntities.add(entity);
        }
    }

    @Override
    public void registerRemoved(Entity entity) {
        if (newEntities.contains(entity)) {
            newEntities.remove(entity);
        } else {
            dirtyEntities.remove(entity);
            removedEntities.add(entity);
        }
    }

    @Override
    @Transactional
    public void commit() {
        try {
            // Insert new entities
            newEntities.forEach(entityManager::persist);

            // Update dirty entities
            dirtyEntities.forEach(entityManager::merge);

            // Remove entities
            removedEntities.forEach(entityManager::remove);

            entityManager.flush();

            // Clear all tracking
            clear();

        } catch (Exception e) {
            rollback();
            throw new UnitOfWorkException("Failed to commit unit of work", e);
        }
    }

    @Override
    public void rollback() {
        if (entityManager.getTransaction().isActive()) {
            entityManager.getTransaction().rollback();
        }
        clear();
    }

    private void clear() {
        newEntities.clear();
        dirtyEntities.clear();
        removedEntities.clear();
    }
}
```

---

## 🎯 **Assessment Framework**

### **Pattern Implementation Checklist**

For each pattern, verify:

- ✅ **Problem Context**: Clearly understand when to use
- ✅ **Structure**: Implement correct class relationships
- ✅ **Behavior**: Ensure proper runtime behavior
- ✅ **Thread Safety**: Consider concurrent access
- ✅ **Performance**: Evaluate memory and CPU impact
- ✅ **Testability**: Easy to unit test
- ✅ **Maintainability**: Easy to modify and extend

### **Common Implementation Mistakes**

1. **Overusing patterns** where simple solutions suffice
2. **Wrong pattern choice** for the problem context
3. **Incomplete implementation** missing key components
4. **Thread safety issues** in concurrent environments
5. **Performance problems** from unnecessary complexity

### **Success Criteria**

- Implement 5+ missing patterns correctly
- Demonstrate practical usage scenarios
- Show pattern combinations (e.g., Factory + Strategy)
- Handle edge cases and error conditions
- Write comprehensive unit tests
- Document when NOT to use each pattern

**Target Score**: 85+ points across all pattern implementations
