const effectStack = [];
const effectMap = new Map();

// ф-я для создания эффекта(упаковки обработчика)
const effect = (fn) => {
    const effectFn = () => {
        cleanup(fn);
        effectStack.push(fn);
        fn(); // Запускаем функцию
        effectStack.pop();
    };
    effectFn();
};

// ф-я для подписки на изменения свойства
const trigger = (target, prop) => {
    const depMap = effectMap.get(target);
    if (depMap) {
        const deps = depMap.get(prop);
        if (deps) {
            deps.forEach((effect) => {
                effect(); // Вызываем все эффекты
            });
        }
    }
};

// ф-я для очистки эффекта от подписок
const cleanup = (effectFn) => {
    for (const [target, depMap] of effectMap) {
        for (const [prop, deps] of depMap) {
            if (deps.has(effectFn)) {
                deps.delete(effectFn);
            }
        }
    }
};

// ф-я для отслеживания изменений свойства
const track = (target, prop) => {
    const currentEffect = effectStack[effectStack.length - 1];
    if (currentEffect) {
        let depMap = effectMap.get(target);
        if (!depMap) {
            depMap = new Map();
            effectMap.set(target, depMap);
        }
        let deps = depMap.get(prop);
        if (!deps) {
            deps = new Set();
            depMap.set(prop, deps);
        }
        deps.add(currentEffect);
    }
};


// ф-я для создания реактивного объекта
export const reactive = (target) => {
    return new Proxy(target, {
        get(target, prop) {
            if (prop in target) {
                track(target, prop);
                return target[prop];
            }
            throw new Error(`Property '${prop}' does not exist on the target object.`);
        },
        set(target, prop, value, receiver) {
            const oldValue = target[prop];
            if (!Object.is(oldValue, value)) {
                Reflect.set(target, prop, value, receiver);
                trigger(target, prop); // Вызываем триггер
            }
            return true;
        }
    });
};


// ф-я для создания реактивного ссылочного объекта (ref)
export const ref = (value) => {
    const refObj = {
        get value() {
            track(refObj, 'value');
            return value;
        },
        set value(newVal) {
            value = newVal;
            trigger(refObj, 'value');
        }
    };
    return refObj;
};

const watch = (source, callback) => {
    let oldValue;
    
    const effectFn = () => {
        const newValue = typeof source === 'function' ? source() : source;
        if (oldValue !== newValue) {
            callback(newValue, oldValue);
            oldValue = newValue;
        }
    };
    
    // Инициализация старого значения один раз
    oldValue = typeof source === 'function' ? source() : source;
    
    // Запуск эффекта
    effect(effectFn);
};

const watchEffect = (effectFn) => {
    // Простой подход для watchEffect
    effect(effectFn);
};

// Пример использования
const state = reactive({
    count: 0,
    name: 'Vue 3'
});

// Создаем эффект, который будет отслеживать изменения
effect(() => {
    console.log(`Count: ${state.count}`);
});

// Изменяем значение
state.count = 1; // Count: 1
state.count = 2; // Count: 2
state.name = 'Vue 3 Rocks!';



// Использование watch для отслеживания отдельного свойства
watch(
    () => state.count, // источник
    (newCount, oldCount) => {
        console.log(`Count изменился с ${oldCount} на ${newCount}`);
    }
);

// Использование watchEffect для отслеживания зависимостей
watchEffect(() => {
    console.log(`Текущее значение count: ${state.count}`);
});

// Изменение значения
state.count = 1; // Count изменился с 0 на 1 и текущая значение count: 1
state.count = 2; // Count изменился с 1 на 2 и текущая значение count: 2