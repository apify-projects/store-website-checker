module.exports.toSimpleState = (state) => {
    const simpleState = {};
    for (const [key, value] of Object.entries(state)) {
        let newValue
        if (Array.isArray(value)) {
            newValue = value.length;
        } else {
            newValue = {};
            for (const [statusKey, statusValue] of Object.entries(value)) {
                newValue[statusKey] = statusValue.length
            }
        }
        simpleState[key] = newValue;
    }
    return simpleState;
};
