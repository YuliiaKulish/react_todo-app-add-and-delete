/* eslint-disable jsx-a11y/label-has-associated-control */
import { FC, FormEvent, useEffect, useRef, useState } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import classNames from 'classnames';

import { getFilteredTodos, Todo } from './types/Todo';
import { UserWarning } from './UserWarning';

import { TodoStatusFilter } from './types/TodoStatusFilter';
import { addTodo, deleteTodo, getTodos, USER_ID } from './api/todos';

import { TodoItem } from './components/TodoItem';

const ADDING_TODO_ID = -1;

export const App: FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState('');
  const [loadingTodoIds, setLoadingTodoIds] = useState<Todo['id'][]>([]);
  const [selectedFilter, setSelectedFilter] = useState(TodoStatusFilter.ALL);
  const [errorMessage, setErrorMessage] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const addLoadingId = (todoId: Todo['id']) => {
    setLoadingTodoIds(current => [...current, todoId]);
  };

  const removeLoadingId = (todoId: Todo['id']) => {
    setLoadingTodoIds(current => current.filter(id => id !== todoId));
  };

  const getIsTodoLoading = (todoId: Todo['id']) =>
    loadingTodoIds.includes(todoId);

  const handleDeleteTodo = (todoId: Todo['id']) => {
    addLoadingId(todoId);
    setErrorMessage('');

    deleteTodo(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );
      })
      .catch(() => setErrorMessage('Unable to delete a todo'))
      .finally(() => removeLoadingId(todoId));
  };

  const handleDeleteAllCompletedTodo = () => {
    const completedTodos = todos.filter(todo => todo.completed);

    if (completedTodos.length === 0) {
      return;
    }

    setErrorMessage('');
    const idsToDelete = completedTodos.map(todo => todo.id);

    setLoadingTodoIds(current => [...current, ...idsToDelete]);

    Promise.allSettled(completedTodos.map(todo => deleteTodo(todo.id))).then(
      results => {
        const successfulIds = results
          .map((result, index) =>
            result.status === 'fulfilled' ? completedTodos[index].id : null,
          )
          .filter((id): id is number => id !== null);

        setTodos(current =>
          current.filter(todo => !successfulIds.includes(todo.id)),
        );

        const hasFailures = results.some(
          result => result.status === 'rejected',
        );

        if (hasFailures) {
          setErrorMessage('Unable to delete a todo');
        }
      },
    );
  };

  const handleAddTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setErrorMessage('Title should not be empty');

      return;
    }

    const newTodo = {
      title: trimmedTitle,
      completed: false,
      userId: USER_ID,
    };

    setTempTodo({ ...newTodo, id: 0 });
    addLoadingId(ADDING_TODO_ID);

    addTodo(newTodo)
      .then(addedTodo => {
        setTodos(currentTodos => [...currentTodos, addedTodo]);
        setTitle('');
      })
      .catch(() => setErrorMessage('Unable to add a todo'))
      .finally(() => {
        removeLoadingId(ADDING_TODO_ID);
        setTempTodo(null);
      });
  };

  useEffect(() => {
    if (!getIsTodoLoading(ADDING_TODO_ID)) {
      inputRef.current?.focus();
    }
  }, [loadingTodoIds]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setErrorMessage('');
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [errorMessage]);

  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'));
  }, []);

  const filteredTodos = getFilteredTodos(todos, selectedFilter);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={classNames('todoapp__toggle-all', {
              active: todos.every(todo => todo.completed),
            })}
            data-cy="ToggleAllButton"
          />

          <form onSubmit={handleAddTodo}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              disabled={getIsTodoLoading(ADDING_TODO_ID)}
              value={title}
              onChange={event => setTitle(event.target.value)}
            />
          </form>
        </header>

        {filteredTodos.length !== 0 && (
          <section className="todoapp__main" data-cy="TodoList">
            <TransitionGroup>
              {filteredTodos.map(todo => (
                <CSSTransition key={todo.id} timeout={300} classNames="item">
                  <TodoItem
                    todo={todo}
                    isLoading={getIsTodoLoading(todo.id)}
                    onDelete={handleDeleteTodo}
                  />
                </CSSTransition>
              ))}

              {tempTodo && (
                <CSSTransition key="temp" timeout={300} classNames="temp-item">
                  <TodoItem
                    todo={tempTodo}
                    isLoading={getIsTodoLoading(ADDING_TODO_ID)}
                    onDelete={() => {}}
                  />
                </CSSTransition>
              )}
            </TransitionGroup>
          </section>
        )}

        {todos.length !== 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: selectedFilter === TodoStatusFilter.ALL,
                })}
                data-cy="FilterLinkAll"
                onClick={() => setSelectedFilter(TodoStatusFilter.ALL)}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: selectedFilter === TodoStatusFilter.ACTIVE,
                })}
                data-cy="FilterLinkActive"
                onClick={() => setSelectedFilter(TodoStatusFilter.ACTIVE)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: selectedFilter === TodoStatusFilter.COMPLETED,
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setSelectedFilter(TodoStatusFilter.COMPLETED)}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(todo => todo.completed)}
              onClick={handleDeleteAllCompletedTodo}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification',
          'is-danger',
          'is-light',
          'has-text-weight-normal',
          { hidden: !errorMessage.length },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
        {/* Unable to load todos
        <br />
        Title should not be empty
        <br />
        Unable to add a todo
        <br />
        Unable to delete a todo
        <br />
        Unable to update a todo */}
      </div>
    </div>
  );
};
